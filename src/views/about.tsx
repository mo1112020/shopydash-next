"use client";

import { useState } from "react";
import { GridPattern } from "@/components/animations/GridPattern";
import { Marquee } from "@/components/animations/Marquee";
import { NumberTicker } from "@/components/animations/NumberTicker";
import { SEO } from "@/components/SEO";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const faqs = [
  // --- Original Questions ---
  {
    id: "1",
    category: "what",
    questionEn: "What is the best online marketplace near me for daily shopping?",
    questionAr: "ما هو أفضل متجر إلكتروني بالقرب مني للتسوق اليومي؟",
    answerEn: "Shopy Dash is your comprehensive local platform in Abo Hommos. We provide access to local stores near you for groceries, electronics, and household needs, delivered right to your door.",
    answerAr: "شوبي داش هي منصتك المحلية المتكاملة في منطقة أبو حمص. نوفر لك الوصول لجميع المتاجر القريبة منك سواء كنت تبحث عن البقالة، الإلكترونيات، أو المستلزمات المنزلية وتسليمها حتى باب بيتك."
  },
  {
    id: "2",
    category: "what",
    questionEn: "Can I order fresh food or electronics from stores open now?",
    questionAr: "هل يمكنني طلب طعام طازج أو إلكترونيات من متاجر مفتوحة الآن؟",
    answerEn: "Yes, you can browse 'Open Now' stores. We feature the best fresh food markets, bakeries, and reliable electronics stores in your area.",
    answerAr: "نعم، يمكنك استعراض المتاجر 'المفتوحة الآن' عبر المنصة. نضم أفضل محلات الطعام الطازج، والمخبوزات، بالإضافة إلى متاجر الإلكترونيات الموثوقة."
  },
  {
    id: "3",
    category: "how",
    questionEn: "How do I compare product prices before buying?",
    questionAr: "كيف يمكنني مقارنة أسعار المنتجات قبل الشراء؟",
    answerEn: "The Shopy Dash app allows you to browse multiple stores, view reviews, and check live discounts, making it incredibly easy to compare items and find the best deals.",
    answerAr: "يتيح لك تطبيق شوبي داش تصفح مختلف المتاجر وتقييماتها، بالإضافة إلى عرض العروض والخصومات المباشرة، مما يسهل عليك مقارنة أسعار السلع واختيار الأفضل لك."
  },
  {
    id: "4",
    category: "how",
    questionEn: "How do I start selling my products on the platform?",
    questionAr: "كيف أبدأ البيع وعرض منتجات متجري على المنصة؟",
    answerEn: "If you own a business, it's easy to join us and expand your sales. We provide a highly reliable platform with a complete order management system to boost your local profits.",
    answerAr: "إذا كنت تمتلك نشاطاً تجارياً، يمكنك بسهولة الانضمام إلينا لتوسيع نطاق مبيعاتك. نحن نوفر منصة موثوقة مع نظام متكامل لإدارة الطلبات وزيادة أرباحك محلياً."
  },
  // --- How Questions ---
  {
    id: "5",
    category: "how",
    questionEn: "How do I create an online store?",
    questionAr: "كيف أنشئ متجر إلكتروني؟",
    answerEn: "With Shopy Dash, you can launch your online store in minutes. Simply register as a seller, upload your products with photos and prices, and start receiving orders from customers in your area — no technical knowledge needed.",
    answerAr: "مع شوبي داش، يمكنك إنشاء متجرك الإلكتروني في دقائق. سجّل كبائع، أضف منتجاتك بالصور والأسعار، وابدأ في استقبال الطلبات من العملاء في منطقتك — لا تحتاج أي خبرة تقنية."
  },
  {
    id: "6",
    category: "how",
    questionEn: "How do I buy from online stores?",
    questionAr: "كيف أشتري من متاجر عبر الإنترنت؟",
    answerEn: "Simply visit Shopy Dash, browse stores near you, add items to your cart and place your order. Delivery arrives fast, and you can pay on delivery for a convenient and secure shopping experience.",
    answerAr: "ببساطة، قم بزيارة شوبي داش، تصفح المتاجر القريبة منك، أضف المنتجات إلى سلة التسوق وأكمل طلبك. التوصيل سريع، ويمكنك الدفع عند الاستلام لتجربة تسوق مريحة وآمنة."
  },
  // --- What Questions ---
  {
    id: "7",
    category: "what",
    questionEn: "What are the best online shopping stores?",
    questionAr: "ما هي أفضل متاجر التسوق عبر الإنترنت؟",
    answerEn: "The best online stores are the ones closest to you! Shopy Dash aggregates the top-rated local shops in Abo Hommos and surrounding areas, so you always get fresh products, fast delivery, and competitive prices from trusted sellers.",
    answerAr: "أفضل المتاجر هي الأقرب إليك! شوبي داش تجمع لك أفضل المتاجر المحلية المُقيّمة في أبو حمص والمناطق المجاورة، لتحصل دائماً على منتجات طازجة، توصيل سريع، وأسعار تنافسية من بائعين موثوقين."
  },
  {
    id: "8",
    category: "what",
    questionEn: "What are online clothing stores?",
    questionAr: "ما هي متاجر الملابس عبر الإنترنت؟",
    answerEn: "Online clothing stores let you browse fashion collections from the comfort of your home. On Shopy Dash, local clothing shops display their latest arrivals, and you can order with fast local delivery.",
    answerAr: "متاجر الملابس عبر الإنترنت تتيح لك تصفح تشكيلات الأزياء من منزلك. على شوبي داش، تعرض محلات الملابس المحلية أحدث المنتجات، ويمكنك الطلب مع توصيل محلي سريع."
  },
  // --- Why Questions ---
  {
    id: "9",
    category: "why",
    questionEn: "Why should you buy from online stores?",
    questionAr: "لماذا تشتري من المتاجر الإلكترونية؟",
    answerEn: "Online shopping saves you time, lets you compare prices effortlessly, and gives you access to a wider selection of products — all from home. With Shopy Dash, you also support local businesses in your community.",
    answerAr: "التسوق عبر الإنترنت يوفر وقتك، يسمح لك بمقارنة الأسعار بسهولة، ويمنحك الوصول لمجموعة أوسع من المنتجات — كل ذلك من المنزل. مع شوبي داش، أنت أيضاً تدعم الأعمال المحلية في مجتمعك."
  },
  {
    id: "10",
    category: "why",
    questionEn: "Why do online shopping stores fail?",
    questionAr: "لماذا تفشل متاجر التسوق عبر الإنترنت؟",
    answerEn: "Most online stores fail due to poor customer trust, slow delivery, and lack of local relevance. Shopy Dash solves this by connecting you only with verified local sellers who deliver quickly and reliably.",
    answerAr: "معظم المتاجر الإلكترونية تفشل بسبب ضعف ثقة العملاء، بطء التوصيل، وعدم الارتباط بالسوق المحلي. شوبي داش تحل هذه المشكلة بربطك فقط ببائعين محليين موثوقين يوفرون توصيلاً سريعاً وموثوقاً."
  },
  // --- Where Questions ---
  {
    id: "11",
    category: "where",
    questionEn: "Where can I find reliable online stores?",
    questionAr: "أين أجد متاجر إلكترونية موثوقة؟",
    answerEn: "Shopy Dash is your trusted destination. Every store on our platform is verified and locally based, so you can shop with confidence knowing your products come from real, nearby businesses.",
    answerAr: "شوبي داش هي وجهتك الموثوقة. كل متجر على منصتنا موثق ومحلي، لتتسوق بثقة وأنت تعلم أن منتجاتك قادمة من أعمال تجارية حقيقية وقريبة منك."
  },
  {
    id: "12",
    category: "where",
    questionEn: "Where can I create an online store?",
    questionAr: "أين يمكنني إنشاء متجر عبر الإنترنت؟",
    answerEn: "You can create your online store directly on Shopy Dash. We provide all the tools you need — product management, order tracking, and instant visibility to local customers in the Abo Hommos area.",
    answerAr: "يمكنك إنشاء متجرك الإلكتروني مباشرة على شوبي داش. نحن نوفر جميع الأدوات التي تحتاجها — إدارة المنتجات، تتبع الطلبات، ورؤية فورية لعملاء محليين في منطقة أبو حمص."
  },
  // --- When Questions ---
  {
    id: "13",
    category: "when",
    questionEn: "When does online shopping peak?",
    questionAr: "متى يبدأ التسوق عبر الإنترنت في الذروة؟",
    answerEn: "Online shopping peaks during evenings, weekends, and holiday seasons. On Shopy Dash, our local stores are available around the clock so you can shop whenever it suits you.",
    answerAr: "التسوق عبر الإنترنت يبلغ ذروته في المساء، عطلات نهاية الأسبوع، ومواسم الأعياد. على شوبي داش، متاجرنا المحلية متاحة على مدار الساعة لتتسوق في أي وقت يناسبك."
  },
  {
    id: "14",
    category: "when",
    questionEn: "When do I receive my shipment from online stores?",
    questionAr: "متى أحصل على شحنة من المتاجر الإلكترونية؟",
    answerEn: "With Shopy Dash, delivery is local and fast — most orders arrive the same day or within hours, unlike traditional online stores that take days to ship.",
    answerAr: "مع شوبي داش، التوصيل محلي وسريع — معظم الطلبات تصل في نفس اليوم أو خلال ساعات، بعكس المتاجر الإلكترونية التقليدية التي تستغرق أياماً في الشحن."
  },
  // --- Who Questions ---
  {
    id: "15",
    category: "who",
    questionEn: "Who runs the most popular online shopping stores?",
    questionAr: "من يدير أشهر متاجر التسوق عبر الإنترنت؟",
    answerEn: "The most successful online stores are run by passionate local entrepreneurs. Shopy Dash empowers these business owners with the digital tools to reach more customers and grow their sales.",
    answerAr: "أنجح المتاجر الإلكترونية يديرها رواد أعمال محليون شغوفون. شوبي داش تمكّن أصحاب الأعمال هؤلاء بالأدوات الرقمية للوصول لمزيد من العملاء وزيادة مبيعاتهم."
  },
  {
    id: "16",
    category: "who",
    questionEn: "Who provides the best online store services?",
    questionAr: "من يقدم أفضل خدمات المتاجر الإلكترونية؟",
    answerEn: "Shopy Dash provides a complete marketplace solution — from store setup and product listing to order management and fast local delivery. We're the all-in-one platform for sellers and buyers in Abo Hommos.",
    answerAr: "شوبي داش تقدم حلاً متكاملاً للسوق الإلكتروني — من إنشاء المتجر وعرض المنتجات إلى إدارة الطلبات والتوصيل المحلي السريع. نحن المنصة الشاملة للبائعين والمشترين في أبو حمص."
  }
];

function FAQItem({ faq, isOpen, onClick }: { faq: typeof faqs[0], isOpen: boolean, onClick: () => void }) {
  return (
    <div className="border-b border-muted last:border-0">
      <button
        onClick={onClick}
        className="w-full py-6 flex items-center justify-between text-right gap-4 group"
      >
        <div className="space-y-1">
          <h3 className={cn(
            "text-xl font-bold transition-colors",
            isOpen ? "text-primary" : "text-foreground group-hover:text-primary"
          )} dir="rtl">
            {faq.questionAr}
          </h3>
          <p className="text-sm text-muted-foreground font-medium" dir="ltr">
            {faq.questionEn}
          </p>
        </div>
        <ChevronDown className={cn(
          "w-6 h-6 shrink-0 transition-transform duration-300 text-muted-foreground",
          isOpen && "rotate-180 text-primary"
        )} />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="pb-8 space-y-4">
              <p className="text-lg text-muted-foreground leading-relaxed" dir="rtl">
                {faq.answerAr}
              </p>
              <p className="text-base text-muted-foreground/80 leading-relaxed italic border-r-2 border-primary/20 pr-4" dir="ltr">
                {faq.answerEn}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function AboutPage() {
  const [openId, setOpenId] = useState<string | null>(null);
  const [category, setCategory] = useState("all");

  const filteredFaqs = category === "all"
    ? faqs
    : faqs.filter(faq => faq.category === category);

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.questionAr,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answerAr
      }
    }))
  };

  return (
    <>
      <SEO
        title="عن شوبي داش | أفضل متجر إلكتروني بالقرب منك"
        description="اكتشف شوبي داش (Shopy Dash)، منصتك المحلية في أبو حمص للتسوق عبر الإنترنت. تسوق طعام طازج، إلكترونيات، وابدأ البيع معنا اليوم."
        url="https://shopydash.store/about"
      />

      <div className="relative min-h-[90vh] flex flex-col items-center p-6 md:p-12 overflow-hidden bg-background">
        <GridPattern
          width={40}
          height={40}
          x={-1}
          y={-1}
          strokeDasharray={"4 2"}
          className="absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,white,transparent_85%)] opacity-60"
        />
        
        <div className="z-10 w-full max-w-4xl space-y-16 py-12">
          
          {/* Header Section */}
          <div className="text-center space-y-4">
            <h1 className="text-5xl md:text-7xl font-black tracking-tight flex flex-wrap justify-center gap-x-4 mb-4">
                <span className="text-foreground">عن</span>
                <span className="text-secondary">شوبي</span>
                <span className="text-primary">داش</span>
              </h1>
              <div className="flex items-center justify-center gap-3 mt-6 opacity-80">
                <span className="text-lg font-bold text-secondary uppercase tracking-widest">SHÖPY</span>
                <span className="text-lg font-bold text-primary uppercase tracking-widest">DASH</span>
              </div>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mt-8" dir="rtl">
                شوبي داش هي المنصة الأولى التي تربط بين أفضل المتاجر المحلية والمجتمع، لتقديم تجربة تسوق إلكترونية سريعة وموثوقة تواكب احتياجاتك اليومية.
              </p>
          </div>

          {/* Stats Section with Number Tickers */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {[
              { labelEn: "Local Shops", labelAr: "متجر محلي", target: 120, plus: true },
              { labelEn: "Active Users", labelAr: "مستخدم نشط", target: 5000, plus: true },
              { labelEn: "Daily Orders", labelAr: "طلب يومي", target: 800, plus: true },
              { labelEn: "Cities", labelAr: "مدن مغطاة", target: 3, plus: false },
            ].map((stat, i) => (
                <div className="flex flex-col items-center justify-center p-6 bg-card rounded-2xl border shadow-sm hover:border-primary/20 transition-colors">
                  <div className="text-3xl md:text-4xl font-black text-primary mb-1 flex items-center">
                    {stat.plus && "+"}
                    <NumberTicker value={stat.target} delay={0.5} />
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-sm font-bold text-foreground" dir="rtl">{stat.labelAr}</span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest">{stat.labelEn}</span>
                  </div>
                </div>
            ))}
          </div>

          {/* FAQ Section - Categorized Accordion */}
          <div className="space-y-8 mt-12 bg-card/50 backdrop-blur-sm p-8 md:p-12 rounded-[2rem] border border-muted">
            <div className="text-center space-y-2">
              <h2 className="text-3xl md:text-4xl font-black text-foreground" dir="rtl">الأسئلة الشائعة</h2>
              <p className="text-muted-foreground uppercase tracking-[0.2em] text-xs font-bold">Frequently Asked Questions</p>
            </div>

            {/* Category Tabs */}
            <div className="flex flex-wrap justify-center gap-2">
              {[
                { key: "all", labelAr: "الكل", labelEn: "All" },
                { key: "how", labelAr: "كيف", labelEn: "How" },
                { key: "what", labelAr: "ماذا", labelEn: "What" },
                { key: "why", labelAr: "لماذا", labelEn: "Why" },
                { key: "where", labelAr: "أين", labelEn: "Where" },
                { key: "when", labelAr: "متى", labelEn: "When" },
                { key: "who", labelAr: "من", labelEn: "Who" },
              ].map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => { setCategory(cat.key); setOpenId(null); }}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-bold transition-all border",
                    category === cat.key
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-card text-muted-foreground border-muted hover:border-primary/30 hover:text-foreground"
                  )}
                >
                  <span dir="rtl">{cat.labelAr}</span>
                  <span className="text-[10px] ml-1 opacity-70">({cat.labelEn})</span>
                </button>
              ))}
            </div>

            <div className="divide-y divide-muted">
              {filteredFaqs.map((faq) => (
                <FAQItem
                  key={faq.id}
                  faq={faq}
                  isOpen={openId === faq.id}
                  onClick={() => setOpenId(openId === faq.id ? null : faq.id)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Marquee Banner - Seamless infinite scroll */}
        <div className="w-screen mt-20 bg-primary/5 py-10 border-y border-primary/10">
          <Marquee repeat={5} className="[--duration:50s]">
            {[
              { ar: "البقالة الطازجة", en: "Fresh Food" },
              { ar: "أفضل المتاجر", en: "Top Shops" },
              { ar: "إلكترونيات دقيقة", en: "Electronics" },
              { ar: "سوق محلي", en: "Marketplace Near Me" },
              { ar: "كل ما تحتاجه في مكان واحد", en: "All in One Place" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-4 px-8">
                <span className="text-2xl font-black text-primary/80 whitespace-nowrap" dir="rtl">{item.ar}</span>
                <span className="text-sm font-bold text-muted-foreground/60 p-1.5 border border-primary/10 rounded-md whitespace-nowrap" dir="ltr">({item.en})</span>
                <div className="w-2 h-2 rounded-full bg-secondary/40 shrink-0" />
              </div>
            ))}
          </Marquee>
        </div>

      </div>
      <script type="application/ld+json">
        {JSON.stringify(faqSchema)}
      </script>
    </>
  );
}
