const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

function renderMap(state) {
  const width = state.map_size.width;
  const height = state.map_size.height;
  const tileSize = 8;
  const canvasWidth = width * tileSize;
  const canvasHeight = height * tileSize;

  const canvas = createCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext('2d');

  const colors = {
    0: '#1a1a3e', 1: '#2d5a27', 2: '#1a3d1a', 3: '#5c5c5c', 4: '#4a90d9'
  };

  const tiles = state.terrain.tiles;
  for (let y = 0; y < tiles.length; y++) {
    for (let x = 0; x < tiles[y].length; x++) {
      ctx.fillStyle = colors[tiles[y][x]] || '#1a1a3e';
      ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
    }
  }

  if (state.terrain.resources) {
    const resColors = { wood: '#8b4513', ore: '#808080', food: '#32cd32', water: '#4a90d9' };
    state.terrain.resources.forEach(r => {
      ctx.fillStyle = resColors[r.type] || '#ffffff';
      ctx.fillRect(r.x * tileSize + 2, r.y * tileSize + 2, 4, 4);
    });
  }

  if (state.settlements) {
    state.settlements.forEach(s => {
      const cx = s.x * tileSize + tileSize / 2;
      const cy = s.y * tileSize + tileSize / 2;
      let radius = 4;
      let color = '#ffd700';
      if (s.population > 500) { radius = 8; color = '#ff4444'; }
      else if (s.population > 100) { radius = 6; color = '#ff8c00'; }

      ctx.shadowColor = color;
      ctx.shadowBlur = 6;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });
  }

  return canvas;
}

async function main() {
  const worldsDir = path.join(__dirname, '..', 'data', 'worlds');
  const worldId = process.env.WORLD_ID;

  if (!fs.existsSync(worldsDir)) {
    console.log('No worlds directory');
    return;
  }

  let worldDirs = worldId ? [worldId] : fs.readdirSync(worldsDir).filter(d => {
    const p = path.join(worldsDir, d);
    return fs.statSync(p).isDirectory() && fs.existsSync(path.join(p, 'state.json'));
  });

  for (const dir of worldDirs) {
    try {
      const statePath = path.join(worldsDir, dir, 'state.json');
      if (!fs.existsSync(statePath)) {
        console.warn(`  Skipping ${dir}: no state.json`);
        continue;
      }
      const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));

      console.log(`Rendering map for ${dir}...`);
      const canvas = renderMap(state);

      const fullPath = path.join(worldsDir, dir, 'map.png');
      const buffer = canvas.toBuffer('image/png');
      fs.writeFileSync(fullPath, buffer);

      const thumbCanvas = createCanvas(200, 120);
      const thumbCtx = thumbCanvas.getContext('2d');
      thumbCtx.drawImage(canvas, 0, 0, 200, 120);
      const thumbPath = path.join(worldsDir, dir, 'map_thumb.png');
      fs.writeFileSync(thumbPath, thumbCanvas.toBuffer('image/png'));

      console.log(`  OK Map saved`);
    } catch (err) {
      console.error(`  FAIL Error rendering ${dir}: ${err.message}`);
    }
  }

  console.log('Map rendering complete!');
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
