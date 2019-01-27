class Webcam {
  private video: HTMLVideoElement;
  init() {
    return new Promise((resolve, reject) => {
      navigator.getUserMedia =
        // @ts-ignore
        navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
      if (!navigator) {
        throw 'Cannot get video stream.';
      }
      this.video = document.createElement('video');
      this.video.width = 640;
      this.video.height = 360;
      this.video.setAttribute('autoplay', 'true');

      navigator.getUserMedia(
        {
          video: {
            width: 640,
            height: 360,
          },
          audio: false,
        },
        (stream) => {
          console.log('Getting stream');
          this.video.srcObject = stream;
          resolve();
        },
        (error) => {
          console.log(error);
          reject();
        },
      );
    });
  }

  getVideo() {
    return this.video;
  }
}

export default new Webcam();
