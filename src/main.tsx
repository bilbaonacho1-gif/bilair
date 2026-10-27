import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import '@fontsource-variable/archivo/wdth.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource/permanent-marker/400.css';
import './styles/base.css';
import './styles/sections.css';
import './styles/intro.css';
import { CartProvider } from './services/cart';
import { Nav } from './components/Nav';
import { Footer } from './components/Footer';
import { CartDrawer } from './components/CartDrawer';
import { Home } from './pages/Home';
import { DropPage } from './pages/DropPage';
import { ProductPage } from './pages/ProductPage';
import { CartPage } from './pages/CartPage';
import { NotFound } from './pages/NotFound';
import { site } from './config/site';
import { IntroProvider } from './components/Intro';

function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

function DemoNotice() {
  if (!site.catalogIsDemo) return null;
  return (
    <p className="demo-notice mono" role="note">
      Vista previa · catálogo de muestra: productos, precios y fotos a confirmar. Para comprar hoy, entrá a la{' '}
      <a href={site.storeUrl} target="_blank" rel="noreferrer">
        tienda oficial
      </a>
      .
    </p>
  );
}

function App() {
  return (
    <MotionConfig reducedMotion="user">
      <CartProvider>
        <BrowserRouter>
          <IntroProvider>
            <ScrollToTop />
            <Nav />
            <main id="main">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/drops/:id" element={<DropPage />} />
                <Route path="/producto/:id" element={<ProductPage />} />
                <Route path="/carrito" element={<CartPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
            <DemoNotice />
            <Footer />
            <CartDrawer />
          </IntroProvider>
        </BrowserRouter>
      </CartProvider>
    </MotionConfig>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
