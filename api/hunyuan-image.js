import tencentcloud from 'tencentcloud-sdk-nodejs';

const AiartClient = tencentcloud.aiart.v20221229.Client;

function getTencentClient() {
  return new AiartClient({
    credential: {
      secretId: process.env.TENCENT_SECRET_ID,
      secretKey: process.env.TENCENT_SECRET_KEY,
    },
    region: process.env.TENCENT_REGION || 'ap-guangzhou',
    profile: {
      httpProfile: { endpoint: 'aiart.tencentcloudapi.com' },
    },
  });
}

export default async function handler(req, res) {
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

    if (!process.env.TENCENT_SECRET_ID || !process.env.TENCENT_SECRET_KEY) {
      return res.status(500).json({ error: 'Tencent credentials not configured on server' });
    }

    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const client = getTencentClient();

    const params = {
      InputImage: base64Data,
      Prompt: '专业宠物证件照，纯色牛仔蓝背景，干净简洁，专业证件照背景，专业摄影棚灯光，高清，细节清晰锐利',
      NegativePrompt: '模糊，低质量，变形，多余肢体',
      Styles: ['000'],
      ResultConfig: {
        Resolution: '768:1024',
      },
      LogoAdd: 0,
    };

    const result = await client.ImageToImage(params);

    if (!result.ResultImage) {
      return res.status(500).json({ error: 'No image returned from Hunyuan' });
    }

    res.json({ image: result.ResultImage });
  } catch (err) {
    console.error('Hunyuan error:', err);
    res.status(500).json({ error: err.message || String(err) });
  }
}
