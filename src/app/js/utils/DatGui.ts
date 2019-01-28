import * as dat from 'dat.gui';

class DatGui {
  public gui: dat.GUI;
  public options: any = {
    showCorners: true,
    showPerspectiveCorners: true,
    showCursor: true,
    showHandPosition: true,
    isSliding: true,
    generateButton () {
    },
    activateSliding () {
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
    actions.add(this.options, 'generateButton');
    actions.add(this.options, 'activateSliding');
  }
}

export default new DatGui();
