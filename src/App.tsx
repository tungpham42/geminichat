import ChatApp from "./ChatApp";
import MainBrandLogo from "./MainBrandLogo";

function App() {
  return (
    <>
      <MainBrandLogo
        logoSrc="/soft-logo.webp"
        mainDomain="soft.io.vn"
        dismissible={false}
        altText="Logo Soft"
      />
      <ChatApp />
    </>
  );
}

export default App;
