import { getPayload } from 'payload'
import config from '@payload-config'

const seed = async () => {
  const payload = await getPayload({ config })

  console.log('🌱 Seeding database with farm content...')

  // ──────────────────────────────────────────
  // 1. Site Settings (Global)
  // ──────────────────────────────────────────
  console.log('  → Site Settings')
  await payload.updateGlobal({
    slug: 'site-settings',
    data: {
      farmName: 'Kurník & Šopa',
      tagline: 'Regenerativní farma',
      contact: {
        email: 'info@kurniksopa.cz',
        phone: '774801667',
        whatsapp: '774801667',
      },
      address: {
        street: 'Č.p. 313',
        city: 'Křepice u Hustopečí',
        zip: '691 65',
      },
      openingHours: 'Po domluvě',
      social: {
        facebook: 'https://facebook.com/kurniksopa',
        instagram: 'https://instagram.com/kurniksopa',
      },
      owner: 'Antonín Wies',
    },
  })

  // ──────────────────────────────────────────
  // 2. Navigation (Global)
  // ──────────────────────────────────────────
  console.log('  → Navigation')
  await payload.updateGlobal({
    slug: 'navigation',
    data: {
      items: [
        { label: 'Produkty', url: '/produkty' },
        { label: 'Akce', url: '/akce' },
        { label: 'O nás', url: '/o-nas' },
        { label: 'Blog', url: '/blog' },
        { label: 'Kontakt', url: '/kontakt' },
      ],
    },
  })

  // ──────────────────────────────────────────
  // 3. Footer (Global)
  // ──────────────────────────────────────────
  console.log('  → Footer')
  await payload.updateGlobal({
    slug: 'footer',
    data: {
      columns: [
        {
          title: 'Rychlé odkazy',
          links: [
            { label: 'Produkty', url: '/produkty' },
            { label: 'O nás', url: '/o-nas' },
            { label: 'Kontakt', url: '/kontakt' },
          ],
        },
        {
          title: 'Kontakt',
          links: [
            { label: 'Telefon: 774 801 667', url: 'tel:+420774801667' },
            { label: 'WhatsApp', url: 'https://wa.me/420774801667' },
          ],
        },
      ],
      copyright: '© 2026 Kurník & Šopa – Regenerativní farma',
    },
  })

  // ──────────────────────────────────────────
  // 4. Product Categories
  // ──────────────────────────────────────────
  console.log('  → Product Categories')

  const catDrubez = await payload.create({
    collection: 'product-categories',
    data: {
      name: 'Drůbež',
      slug: 'drubez',
      description: 'Kuřata, slepice a husy z pastevního chovu',
    },
  })

  const catVejce = await payload.create({
    collection: 'product-categories',
    data: {
      name: 'Vejce',
      slug: 'vejce',
      description: 'Vejce z volného pastevního chovu',
    },
  })

  const catKralici = await payload.create({
    collection: 'product-categories',
    data: {
      name: 'Králíci',
      slug: 'kralici',
      description: 'Králičí maso z pastevního chovu',
    },
  })

  const catZelenina = await payload.create({
    collection: 'product-categories',
    data: {
      name: 'Zelenina',
      slug: 'zelenina',
      description: 'Zelenina pěstovaná bez chemie',
    },
  })

  // ──────────────────────────────────────────
  // 5. Products
  // ──────────────────────────────────────────
  console.log('  → Products')

  await payload.create({
    collection: 'products',
    data: {
      name: 'Vejce z pastvy',
      slug: 'vejce-z-pastvy',
      shortDescription: 'Vejce z volného pastevního chovu, velikost M-L netříděné. Baleno po 10 kusech, minimální odběr 20 kusů.',
      description: {
        root: {
          type: 'root',
          children: [
            {
              type: 'paragraph',
              children: [{ type: 'text', text: 'Naše slepice jsou od dubna do listopadu na loukách v mobilním kurníku. Kde je rotujeme po pastvě a každé 3 dny je posouváme na novou část louky. To slepicím zajistí přísun čerstvé trávy a hmyzu a zároveň se zbytek plochy stihne obnovit – REGENEROVAT.' }],
            },
            {
              type: 'paragraph',
              children: [{ type: 'text', text: 'Na zimu máme slepice v kravíně, ustájené na vysoké vrstvě štěpky. Eliminuje se tím zápach a zabaví to slepice hrabáním. Naše slepice krmíme směsi bez GMO plodin.' }],
            },
            {
              type: 'paragraph',
              children: [{ type: 'text', text: 'Výsledkem toho jsou vejce ve velmi vysoké kvalitě a to nejen chuťově ale obsahem nutričních látek. Prostě zdravá vejce.' }],
            },
            {
              type: 'paragraph',
              children: [{ type: 'text', text: 'Vejce máme v nabídce celoročně.' }],
            },
          ],
          direction: 'ltr',
          format: '',
          indent: 0,
          version: 1,
        },
      },
      price: 9,
      unit: 'ks',
      category: catVejce.id,
      inStock: true,
      seasonal: false,
      featured: true,
      minimumOrder: 20,
      status: 'published',
    },
  })

  await payload.create({
    collection: 'products',
    data: {
      name: 'Slepice na vývar',
      slug: 'slepice-na-vyvar',
      shortDescription: 'Hejno našich nosnic měníme každý rok, většinou koncem listopadu. Skvělý základ do polévek a omáček.',
      description: {
        root: {
          type: 'root',
          children: [
            {
              type: 'paragraph',
              children: [{ type: 'text', text: 'Pokud chcete opravdu kvalitní, chutný slepičí vývar, tak jste na správné adrese. Vývar z našich slepic je skvělý jako základ do polévek a omáček. A je to taky super užitečná věc při nemoci a nachlazení.' }],
            },
          ],
          direction: 'ltr',
          format: '',
          indent: 0,
          version: 1,
        },
      },
      price: 130,
      unit: 'ks',
      weight: 1200,
      category: catDrubez.id,
      inStock: true,
      seasonal: true,
      availableFrom: '2026-11-01',
      availableTo: '2026-12-15',
      featured: false,
      status: 'published',
    },
  })

  await payload.create({
    collection: 'products',
    data: {
      name: 'Živé slepice',
      slug: 'zive-slepice',
      shortDescription: 'Vyřazené nosnice s 70% snáškou. Lepší varianta než zachraňovat slepice z drůbežáren.',
      description: {
        root: {
          type: 'root',
          children: [
            {
              type: 'paragraph',
              children: [{ type: 'text', text: 'Když vyřazujeme naše nosnice z chovu, tak mají ještě 70% snášku. To mnoha lidem bohatě stačí a tak je možnost naše slepice koupit a tím jim prodloužit život.' }],
            },
            {
              type: 'paragraph',
              children: [{ type: 'text', text: 'Za nás je to určitě lepší varianta, než zachraňovat slepice z drůbežáren. V neposlední řadě kvalita našich vyřazených nosnic je úplně jinde, než těch z drůbežárny.' }],
            },
          ],
          direction: 'ltr',
          format: '',
          indent: 0,
          version: 1,
        },
      },
      price: 100,
      unit: 'ks',
      category: catDrubez.id,
      inStock: true,
      seasonal: true,
      availableFrom: '2026-11-01',
      availableTo: '2026-12-15',
      featured: false,
      status: 'published',
    },
  })

  await payload.create({
    collection: 'products',
    data: {
      name: 'Kuřecí maso',
      slug: 'kureci-maso',
      shortDescription: 'Pasená kuřata z regenerativní farmy. Turnusově 5x do roka, duben–listopad. Průměrná váha 2,2 kg.',
      description: {
        root: {
          type: 'root',
          children: [
            {
              type: 'paragraph',
              children: [{ type: 'text', text: 'Naše kuřata chováme od dubna do listopadu. Prostě jen když roste tráva a je možnost pást. Opět v systému regenerativní pastvy, kdy kuřata denně posunujeme.' }],
            },
            {
              type: 'paragraph',
              children: [{ type: 'text', text: 'Troufáme si tvrdit, že ten kdo neochutnal pasené kuře, tak neví, jak doopravdy chutná kuře. Chuť v porovnání s kuřetem z intenzivního chovu nesrovnatelná.' }],
            },
            {
              type: 'paragraph',
              children: [{ type: 'text', text: 'Kuřata prodáváme turnusově 5x do roka. Termíny: konec května, první polovina července, konec srpna, konec září, přelom říjen/listopad. Krmíme směsí bez GMO plodin.' }],
            },
            {
              type: 'paragraph',
              children: [{ type: 'text', text: 'Váha kuřat je mezi 1,6–3 kg. Průměrná váha kuřete 2,2 kg. O kuřata je velký zájem, doporučujeme předem rezervovat.' }],
            },
          ],
          direction: 'ltr',
          format: '',
          indent: 0,
          version: 1,
        },
      },
      price: 190,
      unit: 'kg',
      weight: 2200,
      category: catDrubez.id,
      inStock: true,
      seasonal: true,
      availableFrom: '2026-04-01',
      availableTo: '2026-11-30',
      featured: true,
      status: 'published',
    },
  })

  await payload.create({
    collection: 'products',
    data: {
      name: 'Svatomartinské husy',
      slug: 'svatomartinske-husy',
      shortDescription: 'Husy pasené na loukách od jara do svatého Martina. Váha 5–8 kg. Omezený počet, nutná rezervace.',
      description: {
        root: {
          type: 'root',
          children: [
            {
              type: 'paragraph',
              children: [{ type: 'text', text: 'Husy kupujeme na jaře jako 2. denní housata. Po 3 týdnech je stěhujeme za jejich adoptivními rodiči na louku. Kde je paseme až do svatého Martina.' }],
            },
            {
              type: 'paragraph',
              children: [{ type: 'text', text: 'Na loukách jim dopřáváme nadstandartní prostor, kde po celou dobu rotujeme. Pastva je pro husy, jakožto 100% býložravce, mimořádně důležitá. Výrazně se to projeví na kvalitě jejich masa a tuku.' }],
            },
            {
              type: 'paragraph',
              children: [{ type: 'text', text: 'Ten kdo ochutná naši husu, se vrátí do starých časů, kdy husy chutnaly jako husy. Krmíme směsí bez GMO plodin, pšenicí a kukuřicí.' }],
            },
          ],
          direction: 'ltr',
          format: '',
          indent: 0,
          version: 1,
        },
      },
      price: 330,
      unit: 'ks',
      weight: 6000,
      category: catDrubez.id,
      inStock: true,
      seasonal: true,
      availableFrom: '2026-10-01',
      availableTo: '2026-11-15',
      featured: true,
      status: 'published',
    },
  })

  await payload.create({
    collection: 'products',
    data: {
      name: 'Králičí maso',
      slug: 'kralici-maso',
      shortDescription: 'Králíci z pastevního chovu. Průměrná váha 2 kg. Omezený počet, nutná rezervace předem.',
      description: {
        root: {
          type: 'root',
          children: [
            {
              type: 'paragraph',
              children: [{ type: 'text', text: 'Na naší farmě máme 6–8 chovných samice a 2 samce. Mláďata odstavujeme ve věku 6–8 týdnů. Přesouváme je do ohrádek o velikosti 2x1m, která jim poskytne více prostoru.' }],
            },
            {
              type: 'paragraph',
              children: [{ type: 'text', text: 'Ohrádky denně posunujeme, abychom zajistili králíkům vždy dostatek čerstvé pastvy. Zároveň udržujeme zvířata ve špičkové hygieně a hnojíme přirozeným způsobem louku. Opět se to odráží na vysoké kvalitě masa.' }],
            },
          ],
          direction: 'ltr',
          format: '',
          indent: 0,
          version: 1,
        },
      },
      price: 250,
      unit: 'kg',
      weight: 2000,
      category: catKralici.id,
      inStock: true,
      seasonal: true,
      availableFrom: '2026-05-01',
      availableTo: '2026-11-30',
      featured: false,
      status: 'published',
    },
  })

  await payload.create({
    collection: 'products',
    data: {
      name: 'Cherry rajčata',
      slug: 'cherry-rajcata',
      shortDescription: 'Cherry rajčata pěstovaná bez jakékoliv chemie. Dostupná od přelomu května a června.',
      description: {
        root: {
          type: 'root',
          children: [
            {
              type: 'paragraph',
              children: [{ type: 'text', text: 'Na přelomu května a června začínají zrát naše cherry rajčata. Naši zeleninu pěstujeme bez jakékoliv chemie. Jak na loukách tak i ve foliovníku ctíme soužití s přírodou.' }],
            },
            {
              type: 'paragraph',
              children: [{ type: 'text', text: 'Veškerá hnojiva která používáme jsou na přírodní bázi a sami si je vyrábíme. To nám zaručuje top kvalitu naší zeleniny, která se odrazí na chuti.' }],
            },
          ],
          direction: 'ltr',
          format: '',
          indent: 0,
          version: 1,
        },
      },
      price: 80,
      unit: 'kg',
      category: catZelenina.id,
      inStock: true,
      seasonal: true,
      availableFrom: '2026-06-01',
      availableTo: '2026-10-31',
      featured: false,
      status: 'published',
    },
  })

  await payload.create({
    collection: 'products',
    data: {
      name: 'Salátové okurky',
      slug: 'salatove-okurky',
      shortDescription: 'Okurky pěstované bez chemie, přirozenými hnojivy. Dostupné od přelomu května a června.',
      description: {
        root: {
          type: 'root',
          children: [
            {
              type: 'paragraph',
              children: [{ type: 'text', text: 'Naše salátové okurky pěstujeme bez jakékoliv chemie ve foliovníku i na loukách. Veškerá hnojiva jsou na přírodní bázi. Mohli bychom psát básně, ale nejlepší je vyzkoušet a ochutnat.' }],
            },
          ],
          direction: 'ltr',
          format: '',
          indent: 0,
          version: 1,
        },
      },
      price: 50,
      unit: 'kg',
      category: catZelenina.id,
      inStock: true,
      seasonal: true,
      availableFrom: '2026-06-01',
      availableTo: '2026-10-31',
      featured: false,
      status: 'published',
    },
  })

  // ──────────────────────────────────────────
  // 6. Pages
  // ──────────────────────────────────────────
  console.log('  → Pages')

  await payload.create({
    collection: 'pages',
    data: {
      title: 'O nás',
      slug: 'o-nas',
      content: {
        root: {
          type: 'root',
          children: [
            {
              type: 'heading',
              tag: 'h2',
              children: [{ type: 'text', text: 'Náš příběh' }],
            },
            {
              type: 'paragraph',
              children: [{ type: 'text', text: 'Jsme malá regenerativní farma zabývající se chovem kuřat na maso, nosnic na vejce, hus, králíků a zeleniny. Klademe velký důraz na welfare zvířat a hlavně šetrné zacházení s půdou na které hospodaříme. Naší ambicí není kvantita, ale top kvalita našich produktů.' }],
            },
            {
              type: 'paragraph',
              children: [{ type: 'text', text: 'Už od mala jsem byl „blázen" do zvířat. A i když mě život zavál profesně jinam, tak tam někde uvnitř mě to stále táhlo ke zvířatům. Náš příběh začíná v roce 2011. Při cestách po světě, Nový Zéland a Kanada, jsem narazil na regenerativní zemědělství. Věc u nás do té doby a ještě dlouho po té, nevídaná.' }],
            },
            {
              type: 'paragraph',
              children: [{ type: 'text', text: 'Po návratu z cest (rok 2013) jsem opět zaplul do kanceláře, ale ten červíček ve mně hlodal dál. I přes nesouhlas okolí, že zemědělstvím se nedá živit, jsem si šel za svým. Po x letech shromažďování online informací, jak farmařit regenerativně, se naskytla příležitost pronájmu pozemku. A tak jsem v roce 2018 začal pást jako jeden z prvních lidí v ČR brojlerová kuřata.' }],
            },
            {
              type: 'paragraph',
              children: [{ type: 'text', text: 'Postupně jsme se rozšiřovali a k tomu přibyli králíci, slepice, husy a zelenina.' }],
            },
            {
              type: 'paragraph',
              children: [{ type: 'text', text: 'V roce 2020 do mého týmu přibyla moje přítelkyně Magda a skoro dcera Klárka a v roce 2022 naše dcera Dita. A samozřejmě velký dík za pomoc patří mojí rodině a kamarádům, bez kterých by to celé nešlo realizovat.' }],
            },
            {
              type: 'paragraph',
              children: [{ type: 'text', text: 'Aktuálně farmaříme na 6 hektarech, kde naše zvířata paseme od jara do podzimu. Vejce máme v nabídce celoročně, kuřata v 5 turnusech duben–listopad, husy na svatého Martina.' }],
            },
            {
              type: 'paragraph',
              children: [{ type: 'text', text: 'Práce na farmě nikdy nekončí, někdy je třeba velkých obětí jak fyzických, tak psychických a ne každý den je na růžích ustláno. Přesto nám to dává smysl, naplňuje a ten pohled na zvířata pasená na louce bych za kancelář neměnil.' }],
            },
          ],
          direction: 'ltr',
          format: '',
          indent: 0,
          version: 1,
        },
      },
      status: 'published',
    },
  })

  await payload.create({
    collection: 'pages',
    data: {
      title: 'Kontakt',
      slug: 'kontakt',
      content: {
        root: {
          type: 'root',
          children: [
            {
              type: 'paragraph',
              children: [
                { type: 'text', text: 'Antonín Wies', format: ['bold'] },
              ],
            },
            {
              type: 'paragraph',
              children: [{ type: 'text', text: 'Telefon: 774 801 667' }],
            },
            {
              type: 'paragraph',
              children: [{ type: 'text', text: 'Adresa: Křepice u Hustopečí, Č.p. 313, PSČ 691 65' }],
            },
          ],
          direction: 'ltr',
          format: '',
          indent: 0,
          version: 1,
        },
      },
      status: 'published',
    },
  })

  // ──────────────────────────────────────────
  // 7. Events (sample upcoming events)
  // ──────────────────────────────────────────
  console.log('  → Events')

  await payload.create({
    collection: 'events',
    data: {
      title: 'Den otevřené farmy',
      slug: 'den-otevrene-farmy-2026',
      description: {
        root: {
          type: 'root',
          children: [
            {
              type: 'paragraph',
              children: [{ type: 'text', text: 'Přijďte se podívat, jak funguje regenerativní farma. Prohlédnete si mobilní kurníky, pastviny a dozvíte se více o našem přístupu k zemědělství. Děti si budou moci pohladit zvířata.' }],
            },
          ],
          direction: 'ltr',
          format: '',
          indent: 0,
          version: 1,
        },
      },
      eventType: 'seasonal',
      date: '2026-06-14',
      startTime: '10:00',
      endTime: '16:00',
      location: 'Farma Kurník & Šopa, Křepice u Hustopečí',
      price: 0,
      capacity: 50,
      registeredCount: 0,
      status: 'upcoming',
    },
  })

  await payload.create({
    collection: 'events',
    data: {
      title: 'Workshop: Domácí chov slepic',
      slug: 'workshop-chov-slepic-2026',
      description: {
        root: {
          type: 'root',
          children: [
            {
              type: 'paragraph',
              children: [{ type: 'text', text: 'Praktický workshop o domácím chovu slepic. Dozvíte se vše o výběru plemene, krmení, ustájení a péči o nosnice. Vhodné pro začátečníky i pokročilé chovatele.' }],
            },
          ],
          direction: 'ltr',
          format: '',
          indent: 0,
          version: 1,
        },
      },
      eventType: 'workshop',
      date: '2026-07-19',
      startTime: '09:00',
      endTime: '13:00',
      location: 'Farma Kurník & Šopa, Křepice u Hustopečí',
      price: 500,
      capacity: 15,
      registeredCount: 0,
      status: 'upcoming',
    },
  })

  await payload.create({
    collection: 'events',
    data: {
      title: 'Svatomartinské hody',
      slug: 'svatomartinske-hody-2026',
      description: {
        root: {
          type: 'root',
          children: [
            {
              type: 'paragraph',
              children: [{ type: 'text', text: 'Tradiční svatomartinské hody na farmě. Vyzvednutí objednaných hus, ochutnávka a setkání s farmáři. Přijďte oslavit svatého Martina s námi!' }],
            },
          ],
          direction: 'ltr',
          format: '',
          indent: 0,
          version: 1,
        },
      },
      eventType: 'seasonal',
      date: '2026-11-11',
      startTime: '10:00',
      endTime: '18:00',
      location: 'Farma Kurník & Šopa, Křepice u Hustopečí',
      price: 0,
      capacity: 100,
      registeredCount: 0,
      status: 'upcoming',
    },
  })

  console.log('✅ Seed complete!')
  console.log('   - 3 globals configured')
  console.log('   - 4 product categories')
  console.log('   - 8 products')
  console.log('   - 2 pages (O nás, Kontakt)')
  console.log('   - 3 events')

  process.exit(0)
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err)
  process.exit(1)
})
