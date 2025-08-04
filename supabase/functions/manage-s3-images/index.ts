import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
  GetObjectCommand,
} from "npm:@aws-sdk/client-s3";
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner";

// Setup AWS S3 client
const s3 = new S3Client({
  region: "us-east-2",
  credentials: {
    accessKeyId: Deno.env.get("AWS_ACCESS_KEY_ID")!,
    secretAccessKey: Deno.env.get("AWS_SECRET_ACCESS_KEY")!,
  },
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Content-Type": "application/json",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { operation, fileName, fileType } = await req.json();

    switch (operation) {
      case "upload": {
        const command = new PutObjectCommand({
          Bucket: "icfc-photos",
          Key: fileName,
          ContentType: fileType,
        });
        const signedUrl = await getSignedUrl(s3, command, { expiresIn: 60 });

        return new Response(JSON.stringify({ url: signedUrl }), {
          status: 200,
          headers: corsHeaders,
        });
      }

      case "list": {
        const command = new ListObjectsV2Command({ Bucket: "icfc-photos" });
        const response = await s3.send(command);
        const files = response.Contents?.map((file) => file.Key) ?? [];

        return new Response(JSON.stringify({ files }), {
          status: 200,
          headers: corsHeaders,
        });
      }

      case "delete": {
        if (!fileName) throw new Error("Missing fileName");
        const command = new DeleteObjectCommand({
          Bucket: "icfc-photos",
          Key: fileName,
        });
        await s3.send(command);
        return new Response(JSON.stringify({ message: "File deleted" }), {
          status: 200,
          headers: corsHeaders,
        });
      }

      case "fetch": {
        if (!fileName) throw new Error("Missing fileName");
        const command = new GetObjectCommand({
          Bucket: "icfc-photos",
          Key: fileName,
        });
        const signedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

        return new Response(JSON.stringify({ url: signedUrl }), {
          status: 200,
          headers: corsHeaders,
        });
      }

      default:
        console.error("Invalid operation received:", operation);
        return new Response(JSON.stringify({ error: "Invalid operation" }), {
          status: 400,
          headers: corsHeaders,
        });
    }
  } catch (error) {
    console.error("Function error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
