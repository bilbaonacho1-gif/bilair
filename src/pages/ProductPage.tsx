import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getProduct } from '../data/products';
import { ProductDetail } from '../components/ProductDetail';
import { GarmentVisual } from '../components/Wardrobe';
import { garmentBox } from '../components/Garment';
import { NotFound } from './NotFound';

export function ProductPage() {
  const { id = '' } = useParams();
  const product = getProduct(id);
  const [colorId, setColorId] = useState(product?.colors[0].id ?? '');
  if (!product) return <NotFound />;
  const box = garmentBox[product.garment];

  return (
    <section className="section productpage section--studio">
      <div className="wrap">
        <p className="mono productpage__crumbs">
          <Link to="/">Inicio</Link> / <Link to="/#ropero">Ropero</Link> / {product.name}
        </p>
        <ProductDetail
          key={product.id}
          product={product}
          colorId={colorId}
          onColor={setColorId}
          headingLevel="h1"
          visual={
            <div className="pdp__stage" style={{ aspectRatio: `${box.w} / ${box.h}` }}>
              <span className="wardrobe__garment-inner">
                <GarmentVisual p={product} colorId={colorId} large />
              </span>
            </div>
          }
        />
      </div>
    </section>
  );
}
