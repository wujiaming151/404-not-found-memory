type DecodedPng = {
  width: number;
  height: number;
  data: Uint8ClampedArray;
};

function readUint32(bytes: Uint8Array, offset: number) {
  return (
    bytes[offset] * 0x1000000 +
    (bytes[offset + 1] << 16) +
    (bytes[offset + 2] << 8) +
    bytes[offset + 3]
  );
}

function paeth(a: number, b: number, c: number) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

export async function decodePng(bytes: Uint8Array): Promise<DecodedPng> {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (
    bytes.length < 33 ||
    signature.some((value, index) => bytes[index] !== value)
  ) {
    throw new Error('invalidImage');
  }

  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  const chunks: Uint8Array[] = [];

  for (let offset = 8; offset + 12 <= bytes.length;) {
    const length = readUint32(bytes, offset);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd + 4 > bytes.length) throw new Error('invalidImage');
    const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
    if (type === 'IHDR') {
      width = readUint32(bytes, dataStart);
      height = readUint32(bytes, dataStart + 4);
      bitDepth = bytes[dataStart + 8];
      colorType = bytes[dataStart + 9];
      if (
        bytes[dataStart + 10] !== 0 ||
        bytes[dataStart + 11] !== 0 ||
        (interlace = bytes[dataStart + 12]) !== 0
      ) {
        throw new Error('invalidImage');
      }
    } else if (type === 'IDAT') {
      chunks.push(bytes.slice(dataStart, dataEnd));
    } else if (type === 'IEND') {
      break;
    }
    offset = dataEnd + 4;
  }

  const channels =
    colorType === 6
      ? 4
      : colorType === 2
        ? 3
        : colorType === 4
          ? 2
          : colorType === 0
            ? 1
            : 0;
  if (
    !width ||
    !height ||
    width > 2048 ||
    height > 2048 ||
    bitDepth !== 8 ||
    interlace !== 0 ||
    !channels ||
    !chunks.length
  ) {
    throw new Error('invalidImage');
  }

  const compressedLength = chunks.reduce(
    (total, chunk) => total + chunk.length,
    0,
  );
  const compressed = new Uint8Array(compressedLength);
  let cursor = 0;
  for (const chunk of chunks) {
    compressed.set(chunk, cursor);
    cursor += chunk.length;
  }

  const decompressed = new Uint8Array(
    await new Response(
      new Blob([compressed])
        .stream()
        .pipeThrough(new DecompressionStream('deflate')),
    ).arrayBuffer(),
  );
  const rowLength = width * channels;
  if (decompressed.length !== (rowLength + 1) * height)
    throw new Error('invalidImage');

  const raw = new Uint8Array(rowLength * height);
  for (let y = 0; y < height; y++) {
    const source = y * (rowLength + 1);
    const filter = decompressed[source];
    for (let x = 0; x < rowLength; x++) {
      const value = decompressed[source + x + 1];
      const target = y * rowLength + x;
      const left = x >= channels ? raw[target - channels] : 0;
      const above = y > 0 ? raw[target - rowLength] : 0;
      const upperLeft =
        y > 0 && x >= channels ? raw[target - rowLength - channels] : 0;
      if (filter === 0) raw[target] = value;
      else if (filter === 1) raw[target] = value + left;
      else if (filter === 2) raw[target] = value + above;
      else if (filter === 3)
        raw[target] = value + Math.floor((left + above) / 2);
      else if (filter === 4)
        raw[target] = value + paeth(left, above, upperLeft);
      else throw new Error('invalidImage');
    }
  }

  const data = new Uint8ClampedArray(width * height * 4);
  for (let pixel = 0; pixel < width * height; pixel++) {
    const source = pixel * channels;
    const target = pixel * 4;
    if (colorType === 6) {
      data.set(raw.subarray(source, source + 4), target);
    } else if (colorType === 2) {
      data.set([raw[source], raw[source + 1], raw[source + 2], 255], target);
    } else if (colorType === 4) {
      data.set(
        [raw[source], raw[source], raw[source], raw[source + 1]],
        target,
      );
    } else {
      data.set([raw[source], raw[source], raw[source], 255], target);
    }
  }

  return { width, height, data };
}
