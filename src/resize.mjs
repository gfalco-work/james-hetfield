import aws from 'aws-sdk';
import sharp from 'sharp';

const s3 = new aws.S3();
export const lambdaHandler = async (event) => {
  console.log('Received Step Functions event:', JSON.stringify(event, null, 2));

  // Extract input data from the event
  const input = event.Input; // Assuming the input data is directly passed as "Input" in the event

  // Extract the necessary information from the input data
  const bucket = input.bucket;
  const key = input.key;

  console.log('key: ' + key);
  const folder = 'resized-product-images';

  let body;
  let statusCode = 200;
  try {
    let image = await s3.getObject({Bucket: bucket, Key: key}).promise();

    console.log('Key: ' + key);
    if (key.length > 0) {
      // Remove extension from the key to get the image name
      const imageNameWithExtension = key.split('/').pop(); // Extract the last part of the key (filename with extension)
      const imageName = imageNameWithExtension.split('.').slice(0, -1).join('.');
      const fileExtension = key.split('.').pop();

      // Check that the image type is supported
      if (fileExtension === "jpg" || fileExtension === "png") {
        const sizes = {
          _thumbnail: 150,
          _carousel: 300,
          _product: 600
        };

        const resizedImageUrls = []; // Array to store resized image URLs

        // Loop through sizes to create resized copies of the original image
        for (const [sizeKey, sizeValue] of Object.entries(sizes)) {
          const resizedImage = await resizeImage(image.Body, sizeValue);
          const copyKey = `${folder}/${imageName}/${imageName}${sizeKey}.${fileExtension}`;
          console.log('resized imageName: ' + copyKey);
          const resizedImageUrl = await uploadImageToS3(resizedImage, bucket, copyKey);
          resizedImageUrls.push(resizedImageUrl); // Store resized image URL
        }

        const originalImageDestination = `${folder}/${imageName}/${imageName}.${fileExtension}`;
        // Move the original image to its folder
        const resizedImageUrl = await moveImage(image.Body, bucket, key, originalImageDestination);
        resizedImageUrls.push(resizedImageUrl); // Store resized image URL
        // Return the resized image URLs in the response body
        return {statusCode, body: JSON.stringify({message: "Images Resized", productImage: 'imageName', resizedImageUrls})};
      } else {
        body = `Unsupported image type: ${fileExtension}`;
        console.log(body);
        statusCode = 400;
      }
    }
  } catch (err) {
    console.error(err);
    statusCode = 500;
    body = "Error resizing image: " + err.message;
  }

  console.log(body);

  let headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };

  return {statusCode, body, headers};
}

// Function to resize an image using Sharp
async function resizeImage(imageBuffer, size) {
  return sharp(imageBuffer)
  .resize(size)
  .withMetadata()
  .toBuffer();
}

// Function to upload an image to S3
async function uploadImageToS3(imageBuffer, bucket, key) {
  return await s3.putObject({
    Bucket: bucket,
    Key: key,
    Body: imageBuffer
  }).promise();
}

async function moveImage(imageBuffer, bucket, sourceKey, destinationKey) {
  let originalImage;
  try {
    originalImage = await s3.copyObject({
      Bucket: bucket,
      Key: destinationKey,
      CopySource: `${bucket}/${sourceKey}`
    }).promise();
  } catch (err) {
    console.error(err);
  }
  try {
    await s3.deleteObject({
      Bucket: bucket,
      Key: sourceKey
    }).promise();
  } catch (err) {
    console.error(err);
  }

  return originalImage;
}