const Jimp = require('jimp');
const path = require('path');
const fs = require('fs');

const inputFile = path.join(__dirname, 'src/images/hero-background.jpg');

async function generateIco() {
  try {
    // Load the original image
    const original = await Jimp.read(inputFile);

    // Generate different sizes
    const sizes = [16, 32, 48];
    const images = await Promise.all(
      sizes.map(size => original.clone().resize(size, size).png().getBufferAsync(Jimp.MIME_PNG))
    );

    // Create ICO from multiple images
    // Jimp supports ICO via writeAsync with the right format
    // But we need to use the ico format specifically
    
    // Load individual images as Jimp instances
    const jimpImages = await Promise.all(
      sizes.map(async (size) => {
        const img = original.clone().resize(size, size);
        return img;
      })
    );

    // Jimp can create multi-frame ICO
    const ico = jimpImages[0]; // 16x16 as base
    // Add other sizes as frames
    jimpImages.slice(1).forEach(img => {
      ico.composite(img, 0, 0);
    });
    
    // Actually, let's try a different approach - write each as ICO individually and then combine
    // Jimp's ICO support: write to buffer with ico format
    
    // Use Jimp's built-in ICO writer
    for (let i = 0; i < jimpImages.length; i++) {
      jimpImages[i].write(path.join(__dirname, 'public', `favicon-${sizes[i]}x${sizes[i]}.jpg.ico`));
    }
    
    // Try creating a multi-size ICO by writing at 48x48 (the largest) 
    // ICO supports multiple sizes in one file
    // Jimp's ICO writer may not support multi-frame ICO directly
    
    console.log('ICO images written individually (may not be multi-frame)');
    console.log('Done');

  } catch (err) {
    console.error('Error:', err.message);
    if (err.stack) console.error(err.stack);
  }
}

generateIco();
