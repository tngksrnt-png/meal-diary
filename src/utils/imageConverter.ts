import imageCompression from "browser-image-compression";

const MAX_WIDTH = 800;
const MAX_SIZE_MB = 2;

/**
 * Converts an image file to webp format, resized to max 800px width.
 * Returns the converted File and a data URL for preview.
 */
export async function convertToWebp(
  file: File
): Promise<{ webpFile: File; previewUrl: string }> {
  // Compress and resize
  const compressed = await imageCompression(file, {
    maxWidthOrHeight: MAX_WIDTH,
    maxSizeMB: MAX_SIZE_MB,
    fileType: "image/webp",
    useWebWorker: true,
  });

  // Create a File object with .webp extension
  const webpFile = new File(
    [compressed],
    file.name.replace(/\.[^.]+$/, ".webp"),
    { type: "image/webp" }
  );

  // Generate preview URL
  const previewUrl = URL.createObjectURL(webpFile);

  return { webpFile, previewUrl };
}
