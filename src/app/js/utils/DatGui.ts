import * as dat from 'dat.gui';
import Canvas from '../core/Canvas';

class DatGui {
  public gui: dat.GUI;
  public options: any = {
    showCorners: true,
    showPerspectiveCorners: true,
    showCursor: true,
    showHandPosition: true,
    isSliding: false,
    buttonOffset: 30,
    slidingWidth: 500,
    slidingMaxOffset: 50,
    lerpFactor: 0.1,
    generateButton: () => {
      Canvas.addButton();
    },
    runVideo: () => {
      Canvas.runVideo = true;
    },
    activateSliding: () => {
      this.options.isSliding = true;
    },
  };

  constructor() {
    this.gui = new dat.GUI();
    const informations = this.gui.addFolder('Informations');
    informations.add(this.options, 'showCorners');
    informations.add(this.options, 'showPerspectiveCorners');
    informations.add(this.options, 'showCursor');
    informations.add(this.options, 'showHandPosition');
    const actions = this.gui.addFolder('Actions');
    const buttonOffset = actions.add(this.options, 'buttonOffset').min(5).max(100);
    const slidingMaxOffset = actions.add(this.options, 'slidingMaxOffset').min(5).max(100);
    const slidingWidth = actions.add(this.options, 'slidingWidth').min(50).max(1000);
    const lerpFactor = actions.add(this.options, 'lerpFactor').min(0).max(1).step(0.05);
    actions.add(this.options, 'runVideo');
    actions.add(this.options, 'generateButton');
    actions.add(this.options, 'activateSliding');

    buttonOffset.onChange((value: number) => {
      Canvas.buttonOffset = value;
    });

    lerpFactor.onChange((value: number) => {
      Canvas.lerpFactor = value;
    });

    slidingMaxOffset.onChange((value: number) => {
      Canvas.maxSlidingOffset = value;
    });

    slidingWidth.onChange((value: number) => {
      Canvas.maxSliding = value;
    });
  }
}

export default new DatGui();
