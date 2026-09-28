import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, ArrowRight, ShieldCheck, HandHeart, Truck, BadgeCheck, ShoppingBag, Menu, Scissors } from 'lucide-react';
import s from './home.module.css';

const shop = '/dashboard/products';
const products = [
  { name: 'Leather Handbags', image: 'bag', description: 'Made to carry your everyday.', search: 'handbag', tag: 'HANDCRAFTED' },
  { name: 'Premium Leather Shoes', image: 'shoes', description: 'A better step, beautifully made.', search: 'shoes', tag: 'TIMELESS STYLE' },
  { name: 'Leather Belts', image: 'belt', description: 'The detail that brings it together.', search: 'belt', tag: 'EVERYDAY ESSENTIAL' },
  { name: 'Premium Wallets', image: 'wallet', description: 'Small details. Lasting quality.', search: 'wallet', tag: 'MADE TO LAST' },
];
const productUrl = (search) => `${shop}?search=${encodeURIComponent(search)}`;

function Photo({ name, alt, className = '', hero = false }) {
  return <div className={`${s.photo} ${className}`}><Image src={`/images/home/${name}.webp`} alt={alt} fill sizes={hero ? '(max-width: 700px) 100vw, 50vw' : '(max-width: 700px) 50vw, 30vw'} preload={hero} /></div>;
}
function Eyebrow({ children }) { return <p className={s.eyebrow}>{children}</p>; }
function Button({ children, href = shop, light = false, gold = false }) {
  return <Link className={`${s.button} ${light ? s.buttonLight : ''} ${gold ? s.buttonGold : ''}`} href={href}>{children}<ArrowUpRight size={16} /></Link>;
}
function TextLink({ children, href = shop }) { return <Link className={s.textLink} href={href}>{children}<ArrowUpRight size={15} /></Link>; }
function Brand() { return <Link href="/" className={s.brand} aria-label="AbaCraft home"><span className={s.brandMark}><Image src="/aba-crafts-logo.PNG" width={40} height={40} alt="logo picture"/></span><span>AbaCraft<span className={s.brandDot}>.</span></span></Link>; }

export function HomeHeader() {
  const links = [['Home', '/'], ['Collections', '#collections'], ['How it works', '#how-it-works'], ['Our story', '#our-story']];
  return <header className={s.header}><div className={`${s.container} ${s.nav}`}><Brand /><nav aria-label="Main navigation" className={s.desktopNav}>{links.map(([label, href]) => <Link href={href} key={label}>{label}</Link>)}</nav><div className={s.navActions}><Link className={s.sellLink} href="/auth/sign-up">Become a seller <ArrowUpRight size={14} /></Link><Button gold>Shop now</Button></div><details className={s.mobileMenu}><summary aria-label="Open navigation"><Menu size={25} /></summary><nav aria-label="Mobile navigation">{links.map(([label, href]) => <Link href={href} key={label}>{label}</Link>)}<Link href="/auth/sign-up">Become a seller</Link><Link href={shop}>Shop now</Link></nav></details></div></header>;
}

export function Hero() {
  return <section className={`${s.container} ${s.hero}`}><div className={s.heroCopy}><Eyebrow>ROOTED IN ABA. CRAFTED FOR YOU.</Eyebrow><h1>Discover Quality Leather Goods, <span>Made in Aba</span></h1><p>Authentic leather. Exceptional craftsmanship. Discover beautiful bags, shoes, and everyday essentials, made with care by the skilled hands of Aba’s finest artisans.</p><div className={s.actions}><Button>Shop collection</Button><Button light href="/auth/sign-up">Become a seller</Button></div><div className={s.heroNote}><span />Made with purpose. Made to last.</div></div><div className={s.heroImage}><Photo name="hero" alt="Handcrafted brown leather travel bag and dress shoes on an artisan’s worktable" hero /><div className={s.heroCaption}><span>CRAFTED WITH PRIDE. CARRIED WITH CONFIDENCE.</span><h2>Real Artisans. Real Quality.</h2><p>A little piece of Aba, wherever life takes you.</p></div><span className={s.imageCorner}><ArrowUpRight size={22} /></span></div></section>;
}

export function Benefits() {
  const items = [[ShieldCheck, 'Real Quality', 'Carefully crafted leather goods, made with attention to every detail.'], [HandHeart, 'Support Artisans', 'Every purchase supports the people and skills behind the craft.'], [Truck, 'Safely Delivered', 'From the maker’s hands to your doorstep, with care along the way.'], [BadgeCheck, 'Made in Aba', 'Original craftsmanship from the heart of Nigeria’s creative industry.']];
  return <section className={s.benefits}><div className={s.container}><Eyebrow>MORE THAN A MARKETPLACE</Eyebrow><h2>Why buyers choose AbaCraft</h2><div className={s.benefitGrid}>{items.map(([Icon, title, text]) => <article key={title}><Icon size={25} strokeWidth={1.4} /><h3>{title}</h3><p>{text}</p></article>)}</div></div></section>;
}

export function Collections() {
  return <section id="collections" className={`${s.container} ${s.editorialSection}`}><div className={s.sectionIntro}><Eyebrow>EXPLORE OUR COLLECTIONS</Eyebrow><h2>Timeless<br />{' '}Styles.<br />{' '}Authentic<br />{' '}Craftsmanship.</h2><p>From your first impression to your everyday essentials, discover leather goods with character. Thoughtfully designed and beautifully made in Aba.</p><TextLink>Explore all collections</TextLink></div><div className={s.collectionGrid}><Link href={productUrl('bag')} className={s.largeCategory}><Photo name="bag" alt="Structured brown leather handbag" /><div><span><strong>Bags</strong><small>Carry a little craftsmanship.</small></span><i><ArrowUpRight size={19} /></i></div></Link>{products.slice(1).concat([{ name: 'The Workshop', image: 'artisan', search: '' }]).map((item) => <Link href={item.image === 'artisan' ? '#our-story' : productUrl(item.search)} key={item.name} className={s.category}><Photo name={item.image} alt={item.name === 'The Workshop' ? 'Artisan working leather by hand' : item.name} /><div><span>{item.name.replace('Premium ', '').replace('Leather ', '')}</span><i><ArrowUpRight size={14} /></i></div></Link>)}</div></section>;
}

export function FeaturedProducts() {
  return <section className={s.featured}><div className={`${s.container} ${s.editorialSection}`}><div className={s.sectionIntro}><Eyebrow>MADE TO BE YOURS</Eyebrow><h2>Handpicked<br />{' '}Authentic<br />{' '}Craftsmanship.</h2><p>Discover pieces that bring together quality, purpose, and style. Everyday favourites, crafted to stay with you.</p><TextLink>View all products</TextLink></div><div className={s.productGrid}>{products.map((item) => <Link href={productUrl(item.search)} className={s.productCard} key={item.name}><div className={s.productPhoto}><Photo name={item.image} alt={item.name} /><span>{item.tag}</span></div><div className={s.productInfo}><h3>{item.name}</h3><p>{item.description}</p><div><span>Explore collection</span><i><ArrowUpRight size={16} /></i></div></div></Link>)}</div></div></section>;
}

function ShoppingPreview({ checkout = false }) {
  return <div className={`${s.preview} ${checkout ? s.checkoutPreview : ''}`} aria-hidden="true"><div className={s.previewBar}><span>AbaCraft<span>.</span></span><ShoppingBag size={10} /></div>{checkout ? <><div className={s.previewHeading}>Good things are on their way.</div><div className={s.orderRow}><Photo name="bag" alt="" /><span>Leather Handbag<small>Handcrafted in Aba</small></span><BadgeCheck size={17} /></div><div className={s.previewLine} /><div className={s.previewLine} /><div className={s.previewTotal}>Made for you. Delivered with care.</div><div className={s.previewButton}>Order confirmed <BadgeCheck size={11} /></div></> : <><div className={s.previewHeading}>Find your everyday favourite.</div><div className={s.miniProducts}>{products.map(item => <div key={item.image}><Photo name={item.image} alt="" /><span>{item.name}</span></div>)}</div></>}</div>;
}

export function HowItWorks() {
  const steps = [{ title: 'Discover', text: 'Explore our collections and find the piece that feels like you.', visual: <Photo name="hero" alt="Discover leather goods handmade in Aba" /> }, { title: 'Shop securely', text: 'Choose your favourites and complete your order with confidence.', visual: <ShoppingPreview /> }, { title: 'Delivered to your door', text: 'Sit back and get ready to enjoy craftsmanship made for everyday life.', visual: <ShoppingPreview checkout /> }];
  return <section id="how-it-works" className={s.stepsSection}><div className={`${s.container} ${s.editorialSection}`}><div className={s.sectionIntro}><Eyebrow>GREAT CRAFT. SIMPLE SHOPPING.</Eyebrow><h2>Simple Steps to<br />{' '}Just for You</h2><p>Discover something you love, connect with authentic craftsmanship, and let us bring a piece of Aba to your doorstep.</p><Button>Start shopping now</Button></div><div className={s.stepsGrid}>{steps.map((step, i) => <article className={s.stepCard} key={step.title}><div className={s.stepVisual}>{step.visual}<span className={s.stepNumber}>0{i + 1}</span></div><div className={s.stepCopy}><h3>{step.title}</h3><p>{step.text}</p></div></article>)}</div></div></section>;
}

export function ArtisanStory() {
  return <section id="our-story" className={`${s.container} ${s.story}`}><div className={s.storyImage}><Photo name="artisan" alt="An Aba artisan carefully cutting leather with traditional tools" /><span className={s.storyBadge}>LOCAL HANDS.<br />{' '}<strong>Extraordinary craft.</strong></span><div className={s.storyCaption}>Built on skill.<br />{' '}Finished with pride.</div></div><div className={s.storyCopy}><Eyebrow>OUR STORY</Eyebrow><h2>Connecting Aba’s skilled vendors with buyers everywhere</h2><p>Aba is more than a place. It’s a spirit of creativity, resilience, and remarkable craftsmanship, passed from one generation to the next.</p><p>We connect you with the artisans who put their heart into every stitch. By making their work easier to discover, we’re helping local businesses grow and keeping authentic craft alive.</p><TextLink href="/auth/sign-up">Be part of the story</TextLink></div><div className={s.storyValues}>{[['Celebrating local talent', 'A home for the skilled makers and small businesses at the heart of Aba.'], ['Real people. Real craft.', 'Behind every product is a maker with a story, a skill, and a passion.'], ['Better opportunities', 'Bringing local craftsmanship to more people, in more places.'], ['Tradition, beautifully forward', 'Honouring the craft while building a brighter future for our community.']].map(([title, text]) => <div key={title}><span /><article><h3>{title}</h3><p>{text}</p></article></div>)}</div></section>;
}

export function ShopBanner() { return <section className={`${s.container} ${s.bannerWrap}`}><div className={s.banner}><div><Eyebrow>YOUR NEXT FAVOURITE IS WAITING</Eyebrow><h2>Ready to discover something made in Aba?</h2><p>A little more character. A little more care. Find quality pieces with a story worth carrying.</p></div><Button gold>Start shopping</Button></div></section>; }

export function HomeFooter() {
  return <footer className={s.footer}><div className={s.container}><div className={s.footerTop}><div className={s.footerAbout}><Brand /><p>Authentic craftsmanship. Everyday quality.<br />{' '}Made in Aba, for you and the world.</p><span className={s.footerMade}>LOCAL HANDS. LASTING QUALITY.</span></div><div><h3>SHOP</h3>{products.map(item => <Link key={item.name} href={productUrl(item.search)}>{item.name.replace('Premium ', '')}</Link>)}</div><div><h3>ABOUT</h3><Link href="#our-story">Our story</Link><Link href="#how-it-works">How it works</Link><Link href="/auth/sign-up">Become a seller</Link></div><div><h3>YOUR ACCOUNT</h3><Link href="/auth/sign-in">Sign in</Link><Link href="/account/orders">Your orders</Link><Link href="/cart">Shopping bag <ArrowRight size={12} /></Link></div></div><div className={s.footerBottom}><span>© {new Date().getFullYear()} AbaCraft. All rights reserved.</span><span>Proudly crafted in Aba, Nigeria.</span></div></div></footer>;
}

