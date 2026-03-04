import { fal } from '@fal-ai/client';

fal.config({ credentials: process.env.FAL_KEY });

export default async function handler(req, res) {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }

    if (!process.env.FAL_KEY) {
      return res.status(500).json({ error: 'FAL_KEY not configured on server' });
    }

    console.log('image-to-image: uploading to fal storage...');
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const file = new File([buffer], 'pet.png', { type: 'image/png' });
    const imageUrl = await fal.storage.upload(file);
    console.log('image-to-image: uploaded, URL:', imageUrl);

    console.log('image-to-image: calling fal-ai/nano-banana/edit...');
    const result = await fal.subscribe('fal-ai/nano-banana/edit', {
      input: {
        prompt:
          'Professional and high-quality pet identification photos, with a denim blue background, professional studio lighting, studio shooting effect, high resolution, clear and sharp details. The pet faces the camera, positioned at the level of the eyes, presenting a natural sitting or standing posture, with the head, chest and upper body clearly visible, but not showing the full body image. The facial features are detailed and exquisite, with a cute expression. The composition is centered, symmetrical, clear and balanced.',
        image_urls: [imageUrl],
        num_images: 1,
        output_format: 'png',
        aspect_ratio: '3:4',
      },
    });
    console.log('image-to-image: fal result received');

    const resultUrl = result.data?.images?.[0]?.url;
    if (!resultUrl) {
      console.error('image-to-image: no image URL in result:', JSON.stringify(result.data));
      return res.status(500).json({ error: 'No image returned from AI' });
    }

    console.log('image-to-image: fetching result image from:', resultUrl);
    const imgRes = await fetch(resultUrl);
    const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
    const base64Result = imgBuffer.toString('base64');

    res.json({ image: base64Result });
  } catch (err) {
    console.error('image-to-image error:', err);
    res.status(500).json({ error: err.message || String(err) });
  }
}
