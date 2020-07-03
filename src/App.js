import React from "react";
import "./App.css";
import { Provider } from "react-redux";
import * as SWRTC from "@andyet/simplewebrtc";
import "./ML.js";

const API_KEY = "32b9eb02645b11cb48d53829";
// ====================================================================

const ROOM_NAME = "jumply";
// const ROOM_PASSWORD = "YOUR_ROOM_PASSWORD";
const CONFIG_URL = `https://api.simplewebrtc.com/config/guest/${API_KEY}`;

const store = SWRTC.createStore();
window.store = store;
function App() {
  return (
    <Provider store={store}>
      <SWRTC.Provider configUrl={CONFIG_URL}>

        <SWRTC.Connected>
          {/* Request the user's media */}
          <SWRTC.RequestUserMedia video auto />

          {/* Connect to a room with a name and optional password */}
          <SWRTC.Room name={ROOM_NAME}>
            {({ joined, localMedia, remoteMedia }) => {
              /* Use the rest of the SWRTC React Components to render your UI */
              // console.log(props);
              const remoteVideo = remoteMedia.find(
                (media) => media.kind === "video"
              );
              return <div></div>;
            }}
          </SWRTC.Room>
        </SWRTC.Connected>
      </SWRTC.Provider>
    </Provider>
  );
}

export default App;
