// @ts-ignore
import * as posenet from '@tensorflow-models/posenet';
import Webcam from './Webcam';
import { Vector2 } from '../utils/Vector2';

export default class Canvas {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private net: any;
  private corners: Vector2[];
  private lastHandPosition: Vector2;
  private cursorPosition: Vector2;
  private boo = false;
  private videoHeight: number;
  private videoWidth: number;
  private button: Vector2;
  // Sliding
  private isSliding = false;
  private previousSlidingPosition: Vector2;
  private originSlidingPosition: Vector2;
  private maxSlidingOffset: number = 100;
  private maxSliding: number = 500;
  constructor() {
    this.canvas = document.querySelector('canvas');
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.ctx = this.canvas.getContext('2d');
    this.corners = [];
    this.lastHandPosition = new Vector2(0, 0);
  }

  init() {
    Webcam.init().then(() => {
      this.setupListeners();
      this.loadModel();
    });
  }

  loadModel() {
    posenet.load(1.0).then((net: any) => {
      this.net = net;
      this.render();
    });
  }

  setupListeners() {
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.keyCode === 32 && this.corners.length < 4) {
        this.corners.push(this.lastHandPosition);
      }

      if (e.keyCode === 17) {
        this.addButton();
      }

      if (e.keyCode === 18) {
        this.isSliding = !this.isSliding;
        console.log('Sliding', this.isSliding);
      }
    });
  }

  addButton() {
    const x = Math.floor(Math.random() * this.videoWidth);
    const y = Math.floor(Math.random() * this.videoHeight);
    this.button = new Vector2(x, y);
  }

  drawCorners() {
    this.corners.map((item: Vector2) => {
      this.ctx.fillStyle = '#9ce5f4';
      this.ctx.beginPath();
      this.ctx.fillRect(item.x - 5, item.y - 5, 10, 10);
    });
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

  async render() {
    requestAnimationFrame(() => this.render());
    const video = Webcam.getVideo();
    this.videoWidth = video.width;
    this.videoHeight = video.height;
    const pose = await this.net.estimateSinglePose(video, 0.5, true, 16);
    this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    this.ctx.save();
    this.ctx.scale(-1, 1);
    this.ctx.translate(window.innerWidth * -1, 0);
    this.ctx.drawImage(video, 0, 0, window.innerWidth, (video.height / video.width) * window.innerWidth);
    this.ctx.restore();

    this.drawCorners();

    const keyPoints = pose.keypoints;
    // const rightWrist = this.getPart('rightWrist', keyPoints);
    const rightWrist = this.getHand(keyPoints);

    this.showButton();
    this.checkButtonPressed();

    if (rightWrist) {
      this.ctx.fillStyle = 'red';
      const rightWristPosition = this.getPartLocation(rightWrist, video.width, video.height);
      this.lastHandPosition = rightWristPosition;
      this.ctx.fillRect(rightWristPosition.x - 5, rightWristPosition.y - 5, 10, 10);

      this.showCursor(rightWristPosition, video.width, video.height);

      this.checkSliding(pose);
    }
  }

  checkSliding(pose: any) {
    const handPosition = this.cursorPosition;
    if (this.isSliding) {
      const handPart = this.getHand(pose.keypoints);
      const shoulderPart = this.getPart('rightShoulder', pose.keypoints);

      if (handPart.position.y > shoulderPart.position.y) {
        console.log('Hand below shoulder');
        this.resetSliding();
        return false;
      }

      if (!this.originSlidingPosition) {
        this.originSlidingPosition = handPosition;
        this.previousSlidingPosition = handPosition;
        return false;
      }

      if (Math.abs(handPosition.x - this.originSlidingPosition.x) >= this.maxSliding) {
        console.log('Success');
        this.resetSliding();
      }

      if (Math.abs(handPosition.x - this.previousSlidingPosition.x) <= this.maxSlidingOffset) {
        this.previousSlidingPosition = handPosition;
      } else {
        console.log('Too much offset');
        this.resetSliding();
      }
    }
  }

  resetSliding() {
    this.isSliding = false;
    this.originSlidingPosition = null;
  }

  showButton() {
    if (this.button) {
      this.ctx.beginPath();
      this.ctx.fillStyle = 'blue';
      this.ctx.arc(this.button.x, this.button.y, 30, 0, Math.PI * 2, true);
      this.ctx.fill();
    }
  }

  checkButtonPressed() {
    if (this.button) {
      const radius = 30;
      if (this.cursorPosition.x >= this.button.x - 30 && this.cursorPosition.x <= this.button.x + 30
      && this.cursorPosition.y >= this.button.y - 30 && this.cursorPosition.y <= this.button.y + 30) {
        this.button = null;
      }
    }
  }

  showCursor(handPosition: Vector2, width: number, height: number) {
    if (this.corners.length === 4) {
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

      // const P0P3 = P3.clone().substract(P0);
      // const P3P2 = P2.clone().substract(P3);
      // const P2P1 = P2.clone().substract(P1);
      // const P1P0 = P1.clone().substract(P0);
      //
      // console.log('P0P3', P0P3);
      // console.log('P0P3 Normal', P0P3.normal());
      //
      // const U0 = (handPosition.clone().substract(P0)).scalar(P0P3.normal());
      // const U1 = (handPosition.clone().substract(P2)).scalar(P2P1.normal());
      //
      // const V0 = (handPosition.clone().substract(P0)).scalar(P1P0.normal());
      // const V1 = (handPosition.clone().substract(P3)).scalar(P3P2.normal());
      //
      // const u = U0 / (U0 + U1);
      // const v = V0 / (V0 + V1);
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
