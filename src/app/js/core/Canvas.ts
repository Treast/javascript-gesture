// @ts-ignore
import * as posenet from '@tensorflow-models/posenet';
import Webcam from './Webcam';
import { Vector2 } from '../utils/Vector2';
import DatGui from '../utils/DatGui';

export default class Canvas {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private net: any;
  private corners: Vector2[];
  private lastHandPosition: Vector2;
  private cursorPosition: Vector2;
  private boo = false;
  static videoHeight: number;
  static videoWidth: number;
  // Hand
  private handPosition: Vector2;
  private previousHandPosition: Vector2 = new Vector2(0, 0);
  static lerpFactor: number = 0.1;
  // Button
  static buttonOffset: number = 30;
  static button: Vector2;
  // Sliding
  private previousSlidingPosition: Vector2;
  private originSlidingPosition: Vector2;
  static maxSlidingOffset: number = 100;
  static maxSliding: number = 500;
  // Video
  private video: HTMLVideoElement;
  static runVideo: boolean = false;
  constructor() {
    this.canvas = document.querySelector('canvas');
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.ctx = this.canvas.getContext('2d');
    this.corners = [];
  }

  init() {
    Webcam.init().then(() => {
      this.setupListeners();
      this.loadVideo();
      this.loadModel();
    });
  }

  loadVideo() {
    this.video = document.createElement('video');
    this.video.src = './assets/forme1.mp4';
    this.video.addEventListener('ended', () => this.video.play());
    this.video.addEventListener('canplaythrough', () => this.video.play());
  }

  drawVideo() {
    if (Canvas.runVideo) {
      const videoWidth = 640;
      const videoHeight = 360;
      this.ctx.drawImage(this.video, this.previousHandPosition.x - videoWidth / 2, this.previousHandPosition.y - videoHeight / 2,
                         videoWidth, videoHeight);
    }
  }

  loadModel() {
    posenet.load(0.5).then((net: any) => {
      this.net = net;
      this.render();
    });
  }

  setupListeners() {
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.keyCode === 32 && this.corners.length < 4) {
        this.corners.push(this.previousHandPosition);
      }

      if (e.keyCode === 17) {
        Canvas.addButton();
      }

      if (e.keyCode === 18) {
        DatGui.options.isSliding = !DatGui.options.isSliding;
        console.log('Sliding', DatGui.options.isSliding);
      }
    });
  }

  static addButton() {
    const x = Math.floor(Math.random() * Canvas.videoWidth);
    const y = Math.floor(Math.random() * Canvas.videoHeight);
    Canvas.button = new Vector2(x, y);
  }

  drawCorners() {
    if (DatGui.options.showCorners) {
      this.corners.map((item: Vector2) => {
        this.ctx.fillStyle = '#9ce5f4';
        this.ctx.beginPath();
        this.ctx.fillRect(item.x - 5, item.y - 5, 10, 10);
      });
    }

    if (DatGui.options.showPerspectiveCorners) {
      for (let i = 1; i < this.corners.length; i += 1) {
        const currentCorner = this.corners[i];
        const previousCorner = this.corners[i - 1];
        this.ctx.strokeStyle = '#9ce5f4';
        this.ctx.beginPath();
        this.ctx.moveTo(previousCorner.x, previousCorner.y);
        this.ctx.lineTo(currentCorner.x, currentCorner.y);
        this.ctx.stroke();
      }

      if (this.corners.length === 4) {
        const firstCorner = this.corners[0];
        const lastCorner = this.corners[3];
        this.ctx.strokeStyle = '#9ce5f4';
        this.ctx.beginPath();
        this.ctx.moveTo(firstCorner.x, firstCorner.y);
        this.ctx.lineTo(lastCorner.x, lastCorner.y);
        this.ctx.stroke();

        if (false) {
          const dx = Math.abs(this.corners[0].x - this.corners[3].x);
          const h = Math.abs(this.corners[3].y - this.corners[0].y);
          const dy = Math.abs(this.corners[3].y - this.corners[2].y);
          const w = Math.abs(this.corners[3].x - this.corners[2].x);
          this.corners.map((item: Vector2) => {
            const originX = item.x;
            item.x = item.x + dx * (item.y / h);
            item.y = item.y + dy * (originX / w);
          });

          if (!this.boo) {
            const ux = this.corners[0].x - this.corners[3].x;
            const uy = this.corners[0].y - this.corners[3].y;
            const vx = this.corners[2].x - this.corners[3].x;
            const vy = this.corners[2].y - this.corners[3].y;

            const u = new Vector2(ux, uy);
            const v = new Vector2(vx, vy);

            u.scalar(v);
            this.corners[1] = u;
            this.boo = true;
          }
        }
      }
    }
  }

  async render() {
    requestAnimationFrame(() => this.render());
    const video = Webcam.getVideo();
    Canvas.videoWidth = video.width;
    Canvas.videoHeight = video.height;
    const pose = await this.net.estimateSinglePose(video, 0.5, true, 16);
    this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    this.ctx.save();
    this.ctx.scale(-1, 1);
    this.ctx.translate(window.innerWidth * -1, 0);
    // this.ctx.drawImage(video, 0, 0, window.innerWidth, (video.height / video.width) * window.innerWidth);
    this.ctx.restore();

    this.drawCorners();

    const keyPoints = pose.keypoints;
    // const rightWrist = this.getPart('rightWrist', keyPoints);
    const hand = this.getHand(keyPoints);

    this.showButton();
    this.checkButtonPressed();

    this.drawVideo();

    if (hand) {
      const handPosition = this.getPartLocation(hand, video.width, video.height);

      const currentHandPosition = handPosition.clone();
      currentHandPosition.x = this.lerp(this.previousHandPosition.x, currentHandPosition.x, Canvas.lerpFactor);
      currentHandPosition.y = this.lerp(this.previousHandPosition.y, currentHandPosition.y, Canvas.lerpFactor);
      this.previousHandPosition = currentHandPosition;

      if (DatGui.options.showHandPosition) {
        this.ctx.fillStyle = 'red';
        this.ctx.fillRect(currentHandPosition.x - 5, currentHandPosition.y - 5, 10, 10);
      }

      this.showCursor(currentHandPosition, video.width, video.height);

      this.checkSliding(pose);
    }
  }

  lerp(a: number, b: number, n: number) {
    return (1 - n) * a + n * b;
  }

  checkSliding(pose: any) {
    const handPosition = this.cursorPosition;
    if (DatGui.options.isSliding) {
      this.ctx.fillStyle = 'green';
      this.ctx.font = ' 30px Arial';
      this.ctx.fillText('Sliding activated', 20, (Canvas.videoHeight / Canvas.videoWidth) * window.innerWidth - 20);
      const handPart = this.getHand(pose.keypoints);
      const shoulderPart = this.getPart('rightShoulder', pose.keypoints);

      if (handPart.position.y > shoulderPart.position.y) {
        console.log('Hand below shoulder');
        alert('Hand below shoulder');
        this.resetSliding();
        return false;
      }

      if (!this.originSlidingPosition) {
        this.originSlidingPosition = handPosition;
        this.previousSlidingPosition = handPosition;
        return false;
      }

      if (Math.abs(handPosition.x - this.originSlidingPosition.x) >= Canvas.maxSliding) {
        console.log('Success');
        alert('Success');
        this.resetSliding();
      }

      if (Math.abs(handPosition.x - this.previousSlidingPosition.x) <= Canvas.maxSlidingOffset) {
        this.previousSlidingPosition = handPosition;
      } else {
        console.log('Too much offset');
        alert('Too much offset');
        this.resetSliding();
      }
    }
  }

  resetSliding() {
    DatGui.options.isSliding = false;
    this.originSlidingPosition = null;
  }

  showButton() {
    if (Canvas.button) {
      this.ctx.beginPath();
      this.ctx.fillStyle = 'blue';
      this.ctx.arc(Canvas.button.x, Canvas.button.y, 30, 0, Math.PI * 2, true);
      this.ctx.fill();
    }
  }

  checkButtonPressed() {
    if (Canvas.button) {
      if (this.cursorPosition.x >= Canvas.button.x - Canvas.buttonOffset && this.cursorPosition.x <= Canvas.button.x + Canvas.buttonOffset
      && this.cursorPosition.y >= Canvas.button.y - Canvas.buttonOffset && this.cursorPosition.y <= Canvas.button.y + Canvas.buttonOffset) {
        Canvas.button = null;
      }
    }
  }

  showCursor(handPosition: Vector2, width: number, height: number) {
    if (this.corners.length === 4 && DatGui.options.showCursor) {
      const P3 = this.corners[0];
      const P2 = this.corners[1];
      const P1 = this.corners[2];
      const P0 = this.corners[3];

      const x = (handPosition.x - P3.x) / (P2.x - P3.x);
      const y = (handPosition.y - P2.y) / (P1.y - P2.y);

      this.cursorPosition = new Vector2(x * window.innerWidth, y * (height / width) * window.innerWidth);

      this.ctx.beginPath();
      this.ctx.fillStyle = 'green';
      this.ctx.arc(this.cursorPosition.x, this.cursorPosition.y, 10, 0, Math.PI * 2, true);
      this.ctx.fill();
    }
  }

  getPart(partName: string, keyPoints: []): any {
    return keyPoints.find((item: any) => {
      return item.part === partName;
    });
  }

  getHand(keyPoints: []): any {
    const handKeyPoints = keyPoints.filter((item: any) => {
      return item.part === 'rightWrist' || item.part === 'leftWrist';
    });
    handKeyPoints.sort((a: any, b: any) => {
      return a.score > b.score ? 1 : -1;
    });
    return handKeyPoints[0];
  }

  getPartLocation(part: any, width: any, height: any): Vector2 {
    const x = (window.innerWidth / width) * part.position.x;
    const y = (window.innerHeight / height) * part.position.y;
    return new Vector2(x, y);
  }
}
