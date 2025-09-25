const { spawn } = require('child_process');
const path = require('path');

console.log('Testing GPU crash fix...');
console.log('Starting Electron with GPU fix applied...');

const electronPath = path.join(__dirname, 'node_modules', '.bin', 'electron');
const mainPath = path.join(__dirname, 'dist', 'backend', 'main.js');

const electron = spawn(electronPath, [mainPath, '--dev'], {
  stdio: 'inherit',
  cwd: __dirname
});

electron.on('close', (code) => {
  console.log(`Electron process exited with code ${code}`);
  if (code === 0) {
    console.log('GPU fix test completed successfully');
  } else {
    console.log('GPU fix test failed');
  }
});

electron.on('error', (err) => {
  console.error('Failed to start Electron:', err);
});

setTimeout(() => {
  console.log('Test running for 10 seconds...');
  electron.kill();
}, 10000);
