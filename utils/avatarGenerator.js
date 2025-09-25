async function generateAvatar(selfieImage, selectedTheme, options = {}) {
  try {
    const { seed = Date.now(), variation = 0 } = options;
    // Create a prompt based on the selected theme
    // Allow runtime override via window.CUSTOM_THEME_PROMPTS (user can inject updated prompts)
    const defaultThemePrompts = {
      superhero: 'Transform into a comic book superhero with cape, mask, and heroic pose. Maintain facial features but add superhero costume and dramatic lighting.',
      professional: 'Create a professional LinkedIn-style portrait with business attire, clean background, and confident expression. Corporate headshot quality.',
      instagram: 'Generate a glamorous Instagram model style photo with perfect lighting, trendy makeup, and fashionable styling. High-end photography look.',
      sports: 'Transform into an athletic sports person with sports gear, energetic pose, and dynamic background. Show strength and determination.',
      cyberpunk: 'Create a futuristic cyberpunk warrior with neon accents, tech enhancements, and dystopian atmosphere. Sci-fi character design.',
      popstar: 'Generate a trendy pop star image with stage lighting, stylish outfit, and music industry glamour. Concert performance vibe.',
      scifi: 'Transform into a space explorer or sci-fi adventurer with futuristic suit, cosmic background, and advanced technology elements.',
      meme: 'Create a fun meme-style character with exaggerated features, humorous elements, and internet culture references.',
      retro: 'Generate a vintage retro style portrait with nostalgic color grading, classic fashion, and old-school photography aesthetic.',
      anime: 'Transform into an anime character with large expressive eyes, stylized features, and Japanese animation art style.'
    };

    const themePrompts = (typeof window !== 'undefined' && window.CUSTOM_THEME_PROMPTS) ? { ...defaultThemePrompts, ...window.CUSTOM_THEME_PROMPTS } : defaultThemePrompts;

    const prompt = themePrompts[selectedTheme.id] || 'Create a stylized avatar portrait';

    // Prefer Runware AI; then DeepAI; then HF; then Stable Horde; then placeholder
    const effectiveGenerateImage = runwareOrFallback;

    const generatedImage = await effectiveGenerateImage(
      `Portrait avatar: ${prompt}. Ultra-detailed, sharp focus, studio lighting, realistic skin tones, 1:1 aspect ratio.`,
      [selfieImage],
      { seed, variation, targetSize: 1024 }
    );

    return generatedImage;
    
  } catch (error) {
    console.error('Avatar generation error:', error);
    throw new Error('Failed to generate avatar. Please try again.');
  }
}
async function runwareOrFallback(prompt, images, opts) {
  const runwareKey = (typeof window !== 'undefined' && (window.RUNWARE_API_KEY || localStorage.getItem('RUNWARE_API_KEY')));
  if (runwareKey) {
    try {
      return await runwareGenerateImage(prompt, images, { ...opts, apiKey: runwareKey });
    } catch (e) {
      console.warn('Runware failed, trying next provider:', e);
    }
  }
  const deepKey = (typeof window !== 'undefined' && (window.DEEPAI_API_KEY || localStorage.getItem('DEEPAI_API_KEY')));
  const hfToken = (typeof window !== 'undefined' && (window.HF_TOKEN || localStorage.getItem('HF_TOKEN')));
  // 1) Try DeepAI if configured
  if (deepKey) {
    try {
      return await deepAiGenerateImage(prompt, images, { ...opts, apiKey: deepKey });
    } catch (e) {
      console.warn('DeepAI failed, trying next provider:', e);
    }
  }
  // 2) Try Hugging Face if configured
  if (hfToken) {
    try {
      return await hfSd15GenerateImage(prompt, images, { ...opts, hfToken });
    } catch (e) {
      console.warn('HF failed, trying Stable Horde:', e);
    }
  }
  // 3) Try Stable Horde
  try {
    return await stableHordeGenerateImage(prompt, images, opts);
  } catch (e) {
    console.warn('Stable Horde failed, falling back to placeholder:', e);
  }
  // 4) Placeholder last
  return await placeholderGenerateImage(prompt, images, opts);
}

// Runware AI: upload image then request img2img
async function runwareGenerateImage(prompt, images, { targetSize = 1024, apiKey } = {}) {
  const input = images && images[0];
  if (!input) throw new Error('No selfie image provided');
  if (!apiKey) throw new Error('Missing Runware API key');

  // 1) Upload image, get imageId
  const blob = await dataUrlToBlob(input);
  const form = new FormData();
  form.append('file', new File([blob], 'input.png', { type: 'image/png' }));
  const uploadRes = await fetch('https://api.runware.ai/v1/image/upload', {
    method: 'POST',
    headers: { 'Authorization': `ApiKey ${apiKey}` },
    body: form
  });
  if (!uploadRes.ok) {
    const t = await safeReadText(uploadRes);
    throw new Error(`Runware upload error ${uploadRes.status}: ${t}`);
  }
  const uploadData = await uploadRes.json();
  const imageId = uploadData?.imageId || uploadData?.id;
  if (!imageId) throw new Error('Runware: missing imageId');

  // 2) Inference request (img2img)
  const taskUUID = `task_${Date.now()}_${Math.floor(Math.random()*1e6)}`;
  const body = [
    {
      taskType: 'imageInference',
      taskUUID,
      positivePrompt: `${prompt}`,
      seedImage: imageId,
      model: 'runware:97@2',
      steps: 32,
      CFGScale: 6,
      width: targetSize,
      height: targetSize,
      numberResults: 1
    }
  ];

  const inferRes = await fetch('https://api.runware.ai/v1/inference', {
    method: 'POST',
    headers: {
      'Authorization': `ApiKey ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  if (!inferRes.ok) {
    const t = await safeReadText(inferRes);
    throw new Error(`Runware inference error ${inferRes.status}: ${t}`);
  }
  const inferData = await inferRes.json();
  // Expect results with image URLs
  const url = inferData?.[0]?.results?.[0]?.imageURL || inferData?.results?.[0]?.imageURL || inferData?.images?.[0]?.url;
  if (!url) throw new Error('Runware returned no image URL');
  const imgRes = await fetch(url);
  if (!imgRes.ok) throw new Error('Runware image fetch failed');
  const outBlob = await imgRes.blob();
  return await blobToDataUrl(outBlob);
}

// Hugging Face Inference API - Stable Diffusion v1.5 (JSON body with base64 image in parameters.image)
async function hfSd15GenerateImage(prompt, images, { hfToken, targetSize = 1024 } = {}) {
  const input = images && images[0];
  if (!input) throw new Error('No selfie image provided');
  if (!hfToken) throw new Error('Missing Hugging Face token');

  const endpoint = 'https://api-inference.huggingface.co/models/runwayml/stable-diffusion-v1-5';
  const body = {
    inputs: `${prompt}`,
    parameters: {
      image: input, // full data URL per requested curl shape
      num_inference_steps: 30,
      guidance_scale: 7.5
    },
    options: { wait_for_model: true }
  };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${hfToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errText = await safeReadText(res);
    throw new Error(`HF SD1.5 error ${res.status}: ${errText || res.statusText}`);
  }

  // Most endpoints return binary image when Accept not set explicitly
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const data = await res.json();
    const b64 = Array.isArray(data) ? data[0]?.image : (data?.image || data?.b64_json || data?.[0]?.b64_json);
    if (!b64) throw new Error('HF API returned no image data');
    return `data:image/png;base64,${b64}`;
  }
  const outBlob = await res.blob();
  return await blobToDataUrl(outBlob);
}

// DeepAI Stable Diffusion img2img
async function deepAiGenerateImage(prompt, images, { targetSize = 1024, apiKey } = {}) {
  const input = images && images[0];
  if (!input) throw new Error('No selfie image provided');
  if (!apiKey) throw new Error('Missing DeepAI API key');

  // Convert data URL to Blob/File for multipart form
  const blob = await dataUrlToBlob(input);
  const file = new File([blob], 'input.png', { type: 'image/png' });
  const form = new FormData();
  form.append('image', file);
  form.append('text', `${prompt}`);

  // DeepAI image-editor img2img endpoint (supports image + text)
  const res = await fetch('https://api.deepai.org/api/image-editor', {
    method: 'POST',
    headers: { 'Api-Key': apiKey },
    body: form
  });
  if (!res.ok) {
    const t = await safeReadText(res);
    throw new Error(`DeepAI error ${res.status}: ${t}`);
  }
  const data = await res.json();
  const url = data?.output_url;
  if (!url) throw new Error('DeepAI returned no output_url');
  const imgRes = await fetch(url);
  if (!imgRes.ok) throw new Error('DeepAI image fetch failed');
  const outBlob = await imgRes.blob();
  return await blobToDataUrl(outBlob);
}

// Stable Horde img2img generation (uses community workers)
async function stableHordeGenerateImage(prompt, images, { seed = Date.now(), variation = 0, targetSize = 1024 } = {}) {
  const input = images && images[0];
  if (!input) throw new Error('No selfie image provided');

  const base64Image = dataUrlToBase64(input);
  const apiBase = 'https://stablehorde.net/api/v2';
  const apikey = (typeof window !== 'undefined' && (window.HORDE_KEY || localStorage.getItem('HORDE_KEY'))) || '0000000000';
  const clientAgent = 'selfie-avatar:0.1:local';

  // Avoid KudosUpfront: cap resolution to 576x576 and keep steps modest
  const cappedSize = Math.min(targetSize || 576, 576);

  // Submit async job
  const submitRes = await fetch(`${apiBase}/generate/async`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': apikey,
      'Client-Agent': clientAgent
    },
    body: JSON.stringify({
      prompt,
      nsfw: false,
      censor_nsfw: true,
      trusted_workers: false,
      params: {
        sampler_name: 'k_euler_a',
        cfg_scale: 6.5,
        denoising_strength: 0.6,
        seed: String((seed + variation) >>> 0),
        steps: 20,
        width: cappedSize,
        height: cappedSize
      },
      source_image: base64Image,
      source_processing: 'img2img',
      models: ['stable_diffusion']
    })
  });

  if (!submitRes.ok) {
    const text = await safeReadText(submitRes);
    throw new Error(`Stable Horde submit error ${submitRes.status}: ${text}`);
  }
  const submitData = await submitRes.json();
  const id = submitData.id;
  if (!id) throw new Error('Stable Horde: missing job id');

  // Poll for completion
  const startedAt = Date.now();
  while (true) {
    if (Date.now() - startedAt > 180000) { // 3 minutes
      throw new Error('Stable Horde timeout');
    }
    await delay(3000);
    const checkRes = await fetch(`${apiBase}/generate/check/${id}`, {
      headers: { 'Client-Agent': clientAgent }
    });
    if (!checkRes.ok) continue;
    const check = await checkRes.json();
    if (check.done) break;
  }

  // Fetch result
  const resultRes = await fetch(`${apiBase}/generate/status/${id}`, {
    headers: { 'Client-Agent': clientAgent }
  });
  if (!resultRes.ok) {
    const text = await safeReadText(resultRes);
    throw new Error(`Stable Horde result error ${resultRes.status}: ${text}`);
  }
  const result = await resultRes.json();
  const first = result?.generations?.[0]?.img;
  if (!first) throw new Error('Stable Horde returned no image');
  // first can be a base64 string OR a temporary URL
  if (typeof first === 'string' && (first.startsWith('http://') || first.startsWith('https://'))) {
    const fetchRes = await fetch(first);
    if (!fetchRes.ok) throw new Error('Stable Horde image URL fetch failed');
    const blob = await fetchRes.blob();
    return await blobToDataUrl(blob);
  }
  return `data:image/png;base64,${first}`;
}


// Simple deterministic pseudo-random generator
function createPrng(seed) {
  let state = seed >>> 0;
  return function next() {
    // xorshift32
    state ^= state << 13; state >>>= 0;
    state ^= state >> 17; state >>>= 0;
    state ^= state << 5;  state >>>= 0;
    return (state >>> 0) / 0xffffffff;
  };
}

// Fallback image generator: composites selfie into themed canvas and applies simple effects
async function placeholderGenerateImage(prompt, images, { seed = 0, variation = 0, targetSize = 1024 } = {}) {
  const input = images && images[0];
  if (!input) throw new Error('No selfie image provided');
  try {
    const img = await loadImage(input);
    const size = targetSize;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Background gradient based on prompt hash
    const prng = createPrng((seed + variation) | 0);
    const hue1 = Math.floor(prng() * 360);
    const hue2 = (hue1 + 60 + Math.floor(prng() * 120)) % 360;
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, `hsl(${hue1} 60% 12% / 1)`);
    grad.addColorStop(1, `hsl(${hue2} 70% 18% / 1)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // Draw selfie centered and cover
    const { dx, dy, dWidth, dHeight } = coverRect(size, size, img.width, img.height);
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(img, dx, dy, dWidth, dHeight);
    ctx.restore();

    // Apply themed overlay and contrast
    applyThemeEffects(ctx, size, size, prompt, prng);

    // High-quality export
    return canvas.toDataURL('image/png');
  } catch (e) {
    console.error('Placeholder generation error, returning original selfie:', e);
    // Fallback: return the original selfie image to keep UX flowing
    return typeof input === 'string' ? input : '';
  }
}

function coverRect(containerW, containerH, contentW, contentH) {
  const containerRatio = containerW / containerH;
  const contentRatio = contentW / contentH;
  let dWidth, dHeight;
  if (contentRatio > containerRatio) {
    dHeight = containerH;
    dWidth = contentW * (containerH / contentH);
  } else {
    dWidth = containerW;
    dHeight = contentH * (containerW / contentW);
  }
  const dx = (containerW - dWidth) / 2;
  const dy = (containerH - dHeight) / 2;
  return { dx, dy, dWidth, dHeight };
}

function applyThemeEffects(ctx, width, height, prompt, prng) {
  const p = prompt.toLowerCase();

  // Common vignette
  const vignette = ctx.createRadialGradient(width/2, height/2, Math.min(width, height)*0.2, width/2, height/2, Math.max(width, height)*0.7);
  vignette.addColorStop(0, 'hsla(0,0%,0%,0)');
  vignette.addColorStop(1, 'hsla(0,0%,0%,0.35)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);

  // Theme-specific tints and overlays
  if (p.includes('superhero')) {
    overlayGradient(ctx, width, height, 'hsla(10, 90%, 55%, 0.18)', 'hsla(220, 85%, 50%, 0.18)');
    addNoise(ctx, width, height, prng, 0.02);
  } else if (p.includes('professional') || p.includes('linkedin')) {
    overlaySolid(ctx, width, height, 'hsla(220, 25%, 10%, 0.2)');
    drawFrame(ctx, width, height, 'hsla(210, 15%, 85%, 0.7)');
  } else if (p.includes('instagram')) {
    overlayGradient(ctx, width, height, 'hsla(320, 80%, 55%, 0.12)', 'hsla(45, 90%, 55%, 0.12)');
    addNoise(ctx, width, height, prng, 0.03);
  } else if (p.includes('sports')) {
    overlaySolid(ctx, width, height, 'hsla(140, 75%, 45%, 0.16)');
    addMotionStripes(ctx, width, height, 'hsla(140, 85%, 60%, 0.25)');
  } else if (p.includes('cyberpunk')) {
    overlayGradient(ctx, width, height, 'hsla(280, 85%, 55%, 0.15)', 'hsla(180, 85%, 55%, 0.15)');
    addScanlines(ctx, width, height, 'hsla(0, 0%, 0%, 0.25)');
  } else if (p.includes('pop star') || p.includes('pop star') || p.includes('music')) {
    overlayGradient(ctx, width, height, 'hsla(50, 95%, 55%, 0.12)', 'hsla(330, 95%, 60%, 0.12)');
    addBokeh(ctx, width, height, prng, 'hsla(50, 95%, 70%, 0.35)');
  } else if (p.includes('space') || p.includes('sci-fi') || p.includes('sci fi')) {
    overlaySolid(ctx, width, height, 'hsla(240, 65%, 50%, 0.12)');
    addStars(ctx, width, height, prng);
  } else if (p.includes('meme')) {
    addStickerCorner(ctx, width, height, 'hsla(45, 95%, 55%, 0.85)');
  } else if (p.includes('retro')) {
    addFilmGrain(ctx, width, height, prng, 0.08);
    drawRoundedBorder(ctx, width, height, 'hsla(40, 70%, 80%, 0.8)');
  } else if (p.includes('anime')) {
    overlaySolid(ctx, width, height, 'hsla(330, 85%, 60%, 0.12)');
    addSparkles(ctx, width, height, prng, 'hsla(330, 90%, 80%, 0.9)');
  }
}

function overlayGradient(ctx, w, h, c1, c2) {
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, c1);
  g.addColorStop(1, c2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function overlaySolid(ctx, w, h, c) {
  ctx.fillStyle = c;
  ctx.fillRect(0, 0, w, h);
}

function addNoise(ctx, w, h, prng, strength = 0.02) {
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const n = (prng() * 255 - 128) * strength;
    data[i] = clamp(data[i] + n, 0, 255);
    data[i+1] = clamp(data[i+1] + n, 0, 255);
    data[i+2] = clamp(data[i+2] + n, 0, 255);
  }
  ctx.putImageData(imageData, 0, 0);
}

function addFilmGrain(ctx, w, h, prng, strength = 0.06) {
  addNoise(ctx, w, h, prng, strength);
  addScanlines(ctx, w, h, 'hsla(0, 0%, 0%, 0.07)');
}

function addScanlines(ctx, w, h, color) {
  ctx.save();
  ctx.fillStyle = color;
  for (let y = 0; y < h; y += 3) {
    ctx.fillRect(0, y, w, 1);
  }
  ctx.restore();
}

function drawFrame(ctx, w, h, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 8;
  ctx.strokeRect(6, 6, w - 12, h - 12);
  ctx.restore();
}

function addMotionStripes(ctx, w, h, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 8;
  for (let i = -h; i < w + h; i += 48) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + h, h);
    ctx.stroke();
  }
  ctx.restore();
}

function addBokeh(ctx, w, h, prng, color) {
  ctx.save();
  ctx.fillStyle = color;
  for (let i = 0; i < 25; i++) {
    const r = 8 + prng() * 36;
    const x = prng() * w;
    const y = prng() * h;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function addStars(ctx, w, h, prng) {
  ctx.save();
  ctx.fillStyle = 'white';
  for (let i = 0; i < 200; i++) {
    const x = prng() * w;
    const y = prng() * h;
    const r = prng() * 1.2 + 0.2;
    ctx.globalAlpha = prng() * 0.8 + 0.2;
    ctx.fillRect(x, y, r, r);
  }
  ctx.restore();
}

function drawRoundedBorder(ctx, w, h, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 16;
  roundRect(ctx, 8, 8, w - 16, h - 16, 24);
  ctx.stroke();
  ctx.restore();
}

function addStickerCorner(ctx, w, h, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(w, 0);
  ctx.lineTo(w - 120, 0);
  ctx.lineTo(w, 120);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function addSparkles(ctx, w, h, prng, color) {
  ctx.save();
  ctx.fillStyle = color;
  for (let i = 0; i < 60; i++) {
    const x = prng() * w;
    const y = prng() * h;
    const r = prng() * 2 + 0.5;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function loadImage(src) {
  return new Promise((resolve, reject) => {
    try {
      const img = new Image();
      // Avoid crossOrigin for data URLs to prevent certain browser quirks
      if (typeof src === 'string' && !src.startsWith('data:')) {
        img.crossOrigin = 'anonymous';
      }
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(new Error('Image failed to load'));
      img.src = src;
    } catch (e) {
      reject(e);
    }
  });
}

function dataUrlToBase64(dataUrl) {
  if (!dataUrl.startsWith('data:')) return dataUrl;
  const comma = dataUrl.indexOf(',');
  return dataUrl.slice(comma + 1);
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function safeReadText(res) {
  try { return await res.text(); } catch { return ''; }
}

async function dataUrlToBlob(dataUrl) {
  if (!dataUrl.startsWith('data:')) {
    const resp = await fetch(dataUrl);
    return await resp.blob();
  }
  const arr = dataUrl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new Blob([u8arr], { type: mime });
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}