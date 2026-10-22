import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, Gem, Leaf, PenTool, Sparkles } from 'lucide-react';
import { sized } from '../data/products';
import { Counter, ImageReveal, Marquee, Page, Reveal, SplitText } from '../components/motion';

const SPECIALTIES = [
  { icon: Gem, t: 'Uncompromising quality', d: 'Every piece is made with care from high-grade materials.' },
  { icon: PenTool, t: 'Custom solutions', d: 'Furniture designed around your space, needs and taste.' },
  { icon: Leaf, t: 'Eco-friendly approach', d: 'Sustainability is part of how we work, from timber to finish.' },
  { icon: Sparkles, t: 'Timeless designs', d: 'Current trends balanced with classic shapes, so pieces never date.' },
];

const SERVICES = ['Bespoke furniture design', 'Home & office furnishing', 'Restoration & polishing', 'Interior styling & consultation'];

const TIMELINE = [
  { y: '2024', t: 'The first workbench', d: "Ganesh starts Gany's in Pune with a small team of artisans and designers." },
  { y: '2024', t: 'First 100 homes', d: 'Word of mouth spreads across Pune. Our bouclé loveseat sells out twice.' },
  { y: '2025', t: 'Lighting studio', d: 'We add hand-assembled lighting, from brass pendants to reading lamps.' },
  { y: '2026', t: 'Going online', d: 'This website opens our full collection to homes across India.' },
];

export default function About() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.25]);
  const line = useRef(null);
  const { scrollYProgress: tl } = useScroll({ target: line, offset: ['start 70%', 'end 60%'] });

  return (
    <Page className="about" label="Our story">
      <header className="container page-hero">
        <p className="eyebrow">About us</p>
        <SplitText as="h1" className="mega" text="More than furniture." delay={0.3} />
        <Reveal delay={0.5}>
          <p className="lead narrow">
            Furniture is more than part of your home or office. It shows your personality, makes you comfortable and ends up holding your
            memories. We make well-made, carefully designed pieces that suit your style and your daily life.
          </p>
        </Reveal>
      </header>

      <section className="about__banner" ref={ref}>
        <motion.img style={{ scale }} src="/media/banner.webp" alt="A Gany's living room set" />
      </section>

      <section className="container section about__who">
        <div>
          <p className="eyebrow">Who we are</p>
          <SplitText className="display" text="Born in Pune, 2024." />
        </div>
        <div>
          <Reveal>
            <p className="lead">
              Gany's Furniture started in 2024 in the heart of Pune, with a small team of artisans and designers. Founder Ganesh wanted
              furniture that goes beyond trends: pieces with a story that spark ideas and last for years.
            </p>
          </Reveal>
          <div className="stats stats--inline">
            <Reveal className="stat">
              <strong>
                <Counter to={1200} suffix="+" />
              </strong>
              <span>Happy homes</span>
            </Reveal>
            <Reveal className="stat" delay={0.1}>
              <strong>
                <Counter to={48} />
              </strong>
              <span>Makers</span>
            </Reveal>
            <Reveal className="stat" delay={0.2}>
              <strong>
                <Counter to={98} suffix="%" />
              </strong>
              <span>Would recommend</span>
            </Reveal>
          </div>
        </div>
      </section>

      <Marquee items={SERVICES} reverse />

      <section className="container section">
        <p className="eyebrow">Our specialty</p>
        <div className="values">
          {SPECIALTIES.map(({ icon: Icon, t, d }, i) => (
            <Reveal key={t} delay={i * 0.08} className="value">
              <span className="value__num">0{i + 1}</span>
              <Icon size={28} strokeWidth={1.3} />
              <h3>{t}</h3>
              <p className="muted">{d}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="container section timeline-wrap">
        <div className="timeline__intro">
          <p className="eyebrow">Our journey</p>
          <SplitText className="display" text="A short story, so far." />
          <ImageReveal
            src={sized(
              'https://audocph.com/cdn/shop/products/MENU_Hashira_Floor_Lamp_High_Tearoom_Sofa_High_Back_Plinth_Low.jpg?v=1646913077',
              900,
            )}
            alt="Workshop detail"
          />
        </div>
        <ol className="timeline" ref={line}>
          <motion.span className="timeline__progress" style={{ scaleY: tl }} />
          {TIMELINE.map((e, i) => (
            <Reveal as="li" key={e.t} delay={i * 0.05}>
              <span className="timeline__year">{e.y}</span>
              <h4>{e.t}</h4>
              <p className="muted">{e.d}</p>
            </Reveal>
          ))}
        </ol>
      </section>

      <section className="container section about__why">
        <SplitText className="display" text="Why choose us? Expertise, care and fair prices." />
        <Reveal>
          <p className="lead">
            We put our customers first and give real value for money. Our customers trust us because we look after them long after delivery
            day.
          </p>
          <Link to="/shop" className="btn btn--dark">
            Shop the collection <ArrowRight size={18} />
          </Link>
        </Reveal>
      </section>
    </Page>
  );
}
