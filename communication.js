
export function getRoomAddress() {
  const state = window.store.getState().simplewebrtc;
  const roomAddress = Object.keys(state.rooms);
  if (roomAddress) return roomAddress[0];
}

export function sendInPosition() {
  window.store.dispatch(Actions.setDisplayName("inPosition"));
}

export function whenOpponentReady() {
  return new Promise((resolve, reject) => {
    const pollInterval = setInterval(() => {
      if (getOpponentInPosition()) {
        clearInterval(pollInterval);
        resolve();
      }
    }, 50);
  });
}

export function getOpponentInPosition() {
  const state = window.store.getState().simplewebrtc;
  const peer = Object.values(state.peers)[0];
  return peer && peer.displayName === "inPosition";
}

export function sendScore(score) {
  const roomAddress = getRoomAddress();
  window.store.dispatch(
    Actions.sendChat(roomAddress, {
      body: score,
      displayName: "anon" + userId,
    })
  );
}
