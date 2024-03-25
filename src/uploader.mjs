import aws from 'aws-sdk';
import multipart from 'lambda-multipart-parser';

const s3 = new aws.S3();
const BUCKET_NAME = 'vai-assets';

export const lambdaHandler = async (event) => {
  const folder = 'unprocessed-images';

  let body;
  let statusCode = 200;
  const result = await multipart.parse(event);
  const { content, filename, contentType } = result.files[0];

  try {
    const params = {
      Bucket: `${BUCKET_NAME}/${folder}`,
      Key: filename,
      Body: content,
      ContentType: contentType
    };
    const uploadResult = await s3.upload(params).promise();
    body = JSON.stringify({message: "Successfully uploaded file to S3", uploadResult});
  } catch (e) {
    console.error(e);
    body = JSON.stringify({message: "File failed to upload", errorMessage: e});
    statusCode = 500;
  }
  let headers = {
    "Content-Type": contentType,
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };
  return {statusCode, body, headers};
}