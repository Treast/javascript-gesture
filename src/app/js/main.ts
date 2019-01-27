import App from './utils/App';
import Canvas from './core/Canvas';

const app = new App();

app.isReady().then(() => {
  const canvas = new Canvas();
  canvas.init();
});
