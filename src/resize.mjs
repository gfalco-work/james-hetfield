import aws from 'aws-sdk';
import sharp from 'sharp';

const s3 = new aws.S3();
export const lambdaHandler = async (event) => {
  console.log('Received S3 event:', JSON.stringify(event, null, 2));
  if (event.Records[0].eventName === "ObjectRemoved:Delete") {
    return;
  }
  const bucket = event.Records[0].s3.bucket.name;
  const key = event.Records[0].s3.object.key;
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

        // Loop through sizes to create resized copies of the original image
        for (const [sizeKey, sizeValue] of Object.entries(sizes)) {
          const resizedImage = await resizeImage(image.Body, sizeValue);
          const copyKey = `${folder}/${imageName}/${imageName}${sizeKey}.${fileExtension}`;
          console.log('resized imageName: ' + copyKey);
          await uploadImageToS3(resizedImage, bucket, copyKey);
        }
        body = "Images Resized";

        // Move the original image to its folder
        await moveImage(image.Body, bucket, key, `${folder}/${imageName}/${imageName}.${fileExtension}`);
      } else {
        body = `Unsupported image type: ${fileExtension}`;
        console.log(body);
        statusCode = 400;
        return;
      }
    }
  } catch (err) {
    console.error(err);
    statusCode = 500;
    body = "Error resizing image: " + err.message;
  }

  console.log(body);
  return {statusCode, body};
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
  await s3.putObject({
    Bucket: bucket,
    Key: key,
    Body: imageBuffer
  }).promise();
}

async function moveImage(imageBuffer, bucket, sourceKey, destinationKey) {
  try {
    await s3.copyObject({
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
}