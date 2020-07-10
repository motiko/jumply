import React from "react";
import "./App.css";
import { Provider } from "react-redux";
import * as SWRTC from "@andyet/simplewebrtc";
// import "./virtual.js";

const API_KEY = "32b9eb02645b11cb48d53829";
// ====================================================================

// const ROOM_PASSWORD = "YOUR_ROOM_PASSWORD";
const CONFIG_URL = `https://api.simplewebrtc.com/config/guest/${API_KEY}`;

const store = SWRTC.createStore();
window.store = store;

let path = location.pathname.substr(1);
const userId = Math.floor(Math.random() * 100);
const roomName = `jumply${path ? path : userId}`;
if (!path) location.replace(userId);

function App() {
  return (
    <Provider store={store}>
      <SWRTC.Provider configUrl={CONFIG_URL}>
        <SWRTC.Connected>
          <SWRTC.RequestUserMedia video auto />
          <SWRTC.Room name={roomName}>
            {({ joined, localMedia, remoteMedia }) => {
              const remoteVideo = remoteMedia.find(
                (media) => media.kind === "video"
              );
              return (
                <div>
                  <SWRTC.Video media={remoteVideo} />
                </div>
              );
            }}
          </SWRTC.Room>
        </SWRTC.Connected>
      </SWRTC.Provider>
    </Provider>
  );
}

export default App;
