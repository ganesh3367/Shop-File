import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Page } from '../components/motion';

export default function NotFound() {
  return (
    <Page className="notfound" label="404">
      <div className="container notfound__inner">
        <motion.h1 className="notfound__code" drag dragSnapToOrigin whileDrag={{ scale: 1.05, rotate: -4 }}>
          4<span>0</span>4
        </motion.h1>
        <h2 className="display">This room is still empty.</h2>
        <p className="muted">The page you're looking for has moved, or never existed.</p>
        <div className="confirm__ctas">
          <Link to="/" className="btn btn--dark">
            Back home
          </Link>
          <Link to="/shop" className="btn btn--ghost">
            Browse the shop
          </Link>
        </div>
      </div>
    </Page>
  );
}
