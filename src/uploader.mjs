import aws from 'aws-sdk';
import Buffer from 'node:buffer';

const s3 = new aws.S3();
const BUCKET_NAME = 'vai-assets';

export const lambdaHandler = async (event) => {
  const folder = 'unprocessed-images';

  console.log(event);

  const response = {
    isBase64Encoded: false,
    statusCode: 200,
    body: JSON.stringify({message: "Successfully uploaded file to S3"}),
  };

  try {
    const parsedBody = JSON.parse(event.body);
    const base64File = parsedBody.file;
    const decodedFile = Buffer.from(base64File.replace(/^data:image\/\w+;base64,/, ""), "base64");
    const params = {
      Bucket: BUCKET_NAME,
      Key: `${folder}/${new Date().toISOString()}.jpeg`,
      Body: decodedFile,
      ContentType: "image/jpeg",
    };

    const uploadResult = await s3.upload(params).promise();

    response.body = JSON.stringify({message: "Successfully uploaded file to S3", uploadResult});
  } catch (e) {
    console.error(e);
    response.body = JSON.stringify({message: "File failed to upload", errorMessage: e});
    response.statusCode = 500;
  }

  return response;
}