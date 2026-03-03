import { fal } from '@fal-ai/client';

fal.config({ credentials: process.env.FAL_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const file = new File([buffer], 'pet.png', { type: 'image/png' });
    const imageUrl = await fal.storage.upload(file);

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

    const resultUrl = result.data?.images?.[0]?.url;
    if (!resultUrl) {
      return res.status(500).json({ error: 'No image returned from AI' });
    }

    const imgRes = await fetch(resultUrl);
    const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
    const base64Result = imgBuffer.toString('base64');

    res.json({ image: base64Result });
  } catch (err) {
    console.error('image-to-image error:', err);
    res.status(500).json({ error: err.message || String(err) });
  }
}
