import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight, Briefcase, MapPin, Plus } from 'lucide-react';
import { Page, Reveal, SplitText, ease } from '../components/motion';

const ROLES = [
  {
    t: 'Furniture Designer',
    team: 'Design',
    type: 'Full-time',
    d: 'Create original designs that inspire and delight our customers, from first sketch to final prototype.',
  },
  {
    t: 'Master Craftsperson',
    team: 'Workshop',
    type: 'Full-time',
    d: 'Bring our designs to life with excellent joinery, upholstery and finishing skills.',
  },
  {
    t: 'Sales & Customer Experience',
    team: 'Studio',
    type: 'Full-time',
    d: 'Help customers find the right piece for their home, in our Pune studio and online.',
  },
  {
    t: 'Warehouse & Logistics',
    team: 'Operations',
    type: 'Full-time',
    d: 'Keep inventory and white-glove deliveries running smoothly across the city.',
  },
  {
    t: 'Marketing & Content Creator',
    team: 'Brand',
    type: 'Contract',
    d: 'Share our story with the world through photography, video and social media.',
  },
];

const PERKS = [
  'Staff discount of 40%',
  'Health insurance',
  'Annual design trip',
  'Learn from master artisans',
  'Flexible Fridays',
  'Lunch from the studio kitchen',
];

export default function Careers() {
  const [open, setOpen] = useState(0);
  const [team, setTeam] = useState('All');
  const teams = ['All', ...new Set(ROLES.map((r) => r.team))];
  const roles = ROLES.filter((r) => team === 'All' || r.team === team);

  return (
    <Page className="careers" label="Careers">
      <header className="container page-hero">
        <p className="eyebrow">Careers at Gany's</p>
        <SplitText as="h1" className="mega" text="Join our team." delay={0.3} />
        <Reveal delay={0.5}>
          <p className="lead narrow">
            We're more than a furniture shop. We're a group of creative people, skilled artisans and hard workers who turn houses into
            homes. Great furniture comes from great people.
          </p>
        </Reveal>
      </header>

      <section className="container section careers__grid">
        <div>
          <p className="eyebrow">Current openings · {ROLES.length}</p>
          <div className="chips">
            {teams.map((t) => (
              <button key={t} className={`chip ${team === t ? 'is-active' : ''}`} onClick={() => setTeam(t)}>
                {t}
              </button>
            ))}
          </div>
          <motion.ul className="roles" layout>
            <AnimatePresence mode="popLayout">
              {roles.map((r, i) => (
                <motion.li
                  key={r.t}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`role ${open === i ? 'is-open' : ''}`}
                >
                  <button className="role__head" onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i}>
                    <span>
                      <h3>{r.t}</h3>
                      <small className="muted">
                        <Briefcase size={12} /> {r.team} · {r.type} · <MapPin size={12} /> Pune
                      </small>
                    </span>
                    <motion.span className="role__icon" animate={{ rotate: open === i ? 45 : 0 }}>
                      <Plus size={20} />
                    </motion.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {open === i && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.4, ease }}
                        className="role__body"
                      >
                        <div>
                          <p>{r.d}</p>
                          <a
                            className="btn btn--dark"
                            href={`mailto:support@ganysfurniture.com?subject=Application: ${encodeURIComponent(r.t)}`}
                          >
                            Apply now <ArrowUpRight size={16} />
                          </a>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
        </div>

        <aside className="careers__side">
          <Reveal className="card-soft">
            <h3>Why work with us?</h3>
            <ul className="perk-list">
              {PERKS.map((p) => (
                <li key={p}>✺ {p}</li>
              ))}
            </ul>
          </Reveal>
          <Reveal className="card-soft card-soft--accent" delay={0.1}>
            <h3>Don't see your role?</h3>
            <p>Send your résumé anyway. We're always looking for talented people.</p>
            <p>
              📧 <a href="mailto:support@ganysfurniture.com">support@ganysfurniture.com</a>
              <br />
              📞 +91 83297 93246
            </p>
          </Reveal>
        </aside>
      </section>
    </Page>
  );
}
