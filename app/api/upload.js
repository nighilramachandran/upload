import { IncomingForm } from "formidable";

import { put } from "@vercel/blob";

import fs from "fs";

// import path from "path";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

  // Security check

  const apiKey = req.headers["x-api-key"];

  if (apiKey !== process.env.NEXT_X_API_KEY) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const form = new IncomingForm({
    multiples: false,
    uploadDir: "/tmp",
    keepExtensions: true,
  });

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: "Upload error" });

    const blobPath = fields.blobPath?.[0];

    const uploadedFile = files.file?.[0];

    if (!blobPath || !uploadedFile) {
      return res.status(400).json({ error: "Missing file or blob path" });
    }

    const fileBuffer = fs.readFileSync(uploadedFile.filepath);

    const blob = await put(blobPath, fileBuffer, { access: "public" });

    return res.status(200).json({ url: blob.url });
  });
}
