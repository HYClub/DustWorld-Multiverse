const fs = require('fs');
const path = require('path');

const WorldEngine = require('./engine/world.js');

async function main() {
  const worldsDir = path.join(__dirname, '..', 'data', 'worlds');
  const worldId = process.env.WORLD_ID;
  const iterations = parseInt(process.env.ITERATIONS || '1', 10);

  if (!fs.existsSync(worldsDir)) {
    console.log('No worlds directory found, creating...');
    fs.mkdirSync(worldsDir, { recursive: true });
    return;
  }

  let worldDirs = [];
  if (worldId) {
    if (fs.existsSync(path.join(worldsDir, worldId))) {
      worldDirs = [worldId];
    } else {
      console.error(`World ${worldId} not found`);
      process.exit(1);
    }
  } else {
    worldDirs = fs.readdirSync(worldsDir).filter(dir => {
      const dirPath = path.join(worldsDir, dir);
      return fs.statSync(dirPath).isDirectory() && fs.existsSync(path.join(dirPath, 'state.json'));
    });
  }

  console.log(`Evolving ${worldDirs.length} worlds (${iterations} iteration(s) each)`);

  for (const dir of worldDirs) {
    try {
      console.log(`\n--- Evolving world: ${dir} ---`);
      const configPath = path.join(worldsDir, dir, 'config.json');
      const statePath = path.join(worldsDir, dir, 'state.json');
      const historyPath = path.join(worldsDir, dir, 'history.json');

      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
      let history = [];
      if (fs.existsSync(historyPath)) {
        history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
      }

      const engine = new WorldEngine(config, state);

      let newState = state;
      for (let i = 0; i < iterations; i++) {
        newState = engine.evolve();
        if (engine.history && engine.history.length > 0) {
          history.push(...engine.history);
          engine.history = [];
        }
        console.log(`  Iteration ${i + 1}: Year ${newState.year}, Pop: ${newState.stats.total_population}, Settlements: ${newState.stats.total_settlements}`);
      }

      if (history.length > 1000) {
        history = history.slice(-1000);
      }

      fs.writeFileSync(statePath, JSON.stringify(newState, null, 2));
      fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));

      console.log(`  OK ${dir} complete`);
    } catch (err) {
      console.error(`  FAIL Error evolving ${dir}: ${err.message}`);
    }
  }

  console.log('\nEvolution complete!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
