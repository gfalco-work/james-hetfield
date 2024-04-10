import aws from 'aws-sdk';
const s3 = new aws.S3();
const BUCKET_NAME = 'vai-assets';

export const lambdaHandler = async (event) => {

  let body = '';
  let statusCode = 200;

  const {filename, contentType} = JSON.parse(event.body);
  const key = 'unprocessed-images'/filename;

  const params = {
    Bucket: `${BUCKET_NAME}`,
    Key: `unprocessed-images/${filename}`,
    ContentType: contentType,
    Expires: 3600
  };

  try {
    const uploadUrl = await s3.getSignedUrlPromise('putObject', params);
    body = JSON.stringify(uploadUrl);
  } catch (e) {
    console.error(e);
    body = JSON.stringify({message: "Could not generate a pre-signed Url", errorMessage: e});
    statusCode = 500;
  }
  let headers = {
    "Content-Type": 'application/json',
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };
  return {statusCode, body, headers};
}