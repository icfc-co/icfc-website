import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
  GetObjectCommand,
} from "npm:@aws-sdk/client-s3";
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const s3 = new S3Client({
  region: Deno.env.get("AWS_REGION") || "us-east-2",
  credentials: {
    accessKeyId: Deno.env.get("AWS_ACCESS_KEY_ID")!,
    secretAccessKey: Deno.env.get("AWS_SECRET_ACCESS_KEY")!,
  },
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_ANON_KEY")!
);

const BUCKET = Deno.env.get("S3_BUCKET_NAME") || "icfc-photos";

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

  let body = {};
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  const { operation, fileName, fileType } = body as any;

  const needsAuth = ["upload", "delete"].includes(operation);
  if (needsAuth) {
    const jwt = (req.headers.get("Authorization") || "").replace("Bearer ", "").trim();
    if (!jwt) {
      return new Response(JSON.stringify({ error: "Missing token" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (jwt !== anonKey) {
      const { data, error } = await supabase.auth.getUser(jwt);
      if (error || !data?.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: corsHeaders,
        });
      }
    }
  }

  try {
    switch (operation) {
      case "upload": {
        if (!fileName || !fileType) {
          return new Response(JSON.stringify({ error: "Missing fileName or fileType" }), {
            status: 400,
            headers: corsHeaders,
          });
        }
        const command = new PutObjectCommand({
          Bucket: BUCKET,
          Key: fileName,
          ContentType: fileType,
        });
        const url = await getSignedUrl(s3, command, { expiresIn: 60 });
        return new Response(JSON.stringify({ url }), { status: 200, headers: corsHeaders });
      }

      case "list": {
        const command = new ListObjectsV2Command({ Bucket: BUCKET });
        const res = await s3.send(command);
        const files = res.Contents?.map((f) => f.Key) ?? [];
        return new Response(JSON.stringify({ files }), { status: 200, headers: corsHeaders });
      }

      case "fetch": {
        if (!fileName) {
          return new Response(JSON.stringify({ error: "Missing fileName" }), {
            status: 400,
            headers: corsHeaders,
          });
        }
        const command = new GetObjectCommand({ Bucket: BUCKET, Key: fileName });
        const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
        return new Response(JSON.stringify({ url }), { status: 200, headers: corsHeaders });
      }

      case "delete": {
        if (!fileName) {
          return new Response(JSON.stringify({ error: "Missing fileName" }), {
            status: 400,
            headers: corsHeaders,
          });
        }
        const command = new DeleteObjectCommand({ Bucket: BUCKET, Key: fileName });
        await s3.send(command);
        return new Response(JSON.stringify({ message: "File deleted" }), {
          status: 200,
          headers: corsHeaders,
        });
      }

      default:
        return new Response(JSON.stringify({ error: "Invalid operation" }), {
          status: 400,
          headers: corsHeaders,
        });
    }
  } catch (err: any) {
    console.error("❌ Function error:", err);
    return new Response(JSON.stringify({ error: err.message || "Unknown error" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
