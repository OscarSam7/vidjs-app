import { prisma } from "@/lib/db/prisma";
import * as bcrypt from "bcryptjs";

/**
 * Inicializa de forma idempotente los datos base de Gestión Gastronómica para un Tenant y su Sede activa:
 * - Sectores (Salón principal, Barra, Terraza, VIP, Discoteca, Camarotes, Patio, Reservados)
 * - Configuración de entrega (Retiro en barra + Entrega por mozo)
 * - 12 Categorías del Menú Digital (Cervezas, Bebidas, Tragos, Cócteles, Vinos, Comidas, Hamburguesas, Pizzas, Picadas, Postres, Promociones, Productos especiales)
 * - Insumos e Ingredientes con Recetas (ej: Hamburguesa especial con Pan, Carne, Queso, Panceta, Verduras)
 * - Productos reales con precios en Gs. (PYG), códigos SKU, stock y adicionales
 * - Usuarios de roles gastronómicos de demostración si no existen
 */
export async function ensureGastronomySeeded(tenantId: string, venueId?: string) {
  let targetVenueId = venueId;
  if (!targetVenueId) {
    const firstVenue = await prisma.venue.findFirst({
      where: { tenantId, active: true },
      orderBy: { createdAt: "asc" },
    });
    if (!firstVenue) return null;
    targetVenueId = firstVenue.id;
  }

  // 1. Verificar si ya existen categorías gastronómicas para este tenant
  const existingCategoriesCount = await prisma.gastroCategory.count({
    where: { tenantId },
  });

  if (existingCategoriesCount > 0) {
    // Asegurar que exista GastroDeliveryConfig para esta sede
    const existingConfig = await prisma.gastroDeliveryConfig.findUnique({
      where: { venueId: targetVenueId },
    });
    if (!existingConfig) {
      await prisma.gastroDeliveryConfig.create({
        data: {
          tenantId,
          venueId: targetVenueId,
          barPickupEnabled: true,
          waiterDeliveryEnabled: true,
          defaultDeliveryMode: "WAITER_DELIVERY",
          serviceFeeCents: 0,
          serviceFeePercent: 0,
          requirePaymentBeforePrep: false,
          allowKitchenDirectDeliveryException: false,
          currency: "PYG",
        },
      });
    }
    return { seeded: false, venueId: targetVenueId };
  }

  // 2. Crear Sectores Físicos (Fase 9)
  const sectorsData = [
    { name: "Salón principal", code: "SALON", colorHex: "#8B5CF6", orderIndex: 1 },
    { name: "Barra", code: "BARRA", colorHex: "#06B6D4", orderIndex: 2 },
    { name: "Terraza", code: "TERRAZA", colorHex: "#10B981", orderIndex: 3 },
    { name: "VIP", code: "VIP", colorHex: "#F59E0B", orderIndex: 4 },
    { name: "Discoteca", code: "DISCO", colorHex: "#EC4899", orderIndex: 5 },
    { name: "Camarotes", code: "CAMAROTES", colorHex: "#6366F1", orderIndex: 6 },
    { name: "Patio", code: "PATIO", colorHex: "#14B8A6", orderIndex: 7 },
    { name: "Reservados", code: "RESERVADOS", colorHex: "#F43F5E", orderIndex: 8 },
  ];

  const createdSectors: Record<string, string> = {};
  for (const s of sectorsData) {
    const sector = await prisma.gastroSector.upsert({
      where: { venueId_code: { venueId: targetVenueId, code: s.code } },
      update: {},
      create: {
        tenantId,
        venueId: targetVenueId,
        name: s.name,
        code: s.code,
        colorHex: s.colorHex,
        orderIndex: s.orderIndex,
        active: true,
      },
    });
    createdSectors[s.code] = sector.id;
  }

  // Vincular mesas existentes a sectores si no tienen sectorId
  const tables = await prisma.table.findMany({ where: { tenantId, venueId: targetVenueId } });
  for (let i = 0; i < tables.length; i++) {
    const t = tables[i];
    if (!t.sectorId) {
      const assignedSectorId =
        t.label.toLowerCase().includes("barra")
          ? createdSectors["BARRA"]
          : t.label.toLowerCase().includes("vip")
          ? createdSectors["VIP"]
          : t.label.toLowerCase().includes("terraza")
          ? createdSectors["TERRAZA"]
          : createdSectors["SALON"];
      await prisma.table.update({
        where: { id: t.id },
        data: {
          sectorId: assignedSectorId,
          posX: (i % 4) * 220 + 40,
          posY: Math.floor(i / 4) * 160 + 40,
        },
      });
    }
  }

  // 3. Crear Configuración de Entrega (Fase 3)
  await prisma.gastroDeliveryConfig.upsert({
    where: { venueId: targetVenueId },
    update: {},
    create: {
      tenantId,
      venueId: targetVenueId,
      barPickupEnabled: true,
      waiterDeliveryEnabled: true,
      defaultDeliveryMode: "WAITER_DELIVERY",
      serviceFeeCents: 5000, // Gs. 5.000 opcional o 0
      serviceFeePercent: 0,
      requirePaymentBeforePrep: false,
      allowKitchenDirectDeliveryException: false,
      currency: "PYG",
    },
  });

  // 4. Crear las 12 Categorías Oficiales (Fase 2)
  const categoriesData = [
    { name: "Cervezas", slug: "cervezas", destination: "BAR", iconName: "Beer", orderIndex: 1 },
    { name: "Bebidas", slug: "bebidas", destination: "BAR", iconName: "CupSoda", orderIndex: 2 },
    { name: "Tragos", slug: "tragos", destination: "BAR", iconName: "GlassWater", orderIndex: 3 },
    { name: "Cócteles", slug: "cocteles", destination: "BAR", iconName: "Martini", orderIndex: 4 },
    { name: "Vinos", slug: "vinos", destination: "BAR", iconName: "Wine", orderIndex: 5 },
    { name: "Comidas", slug: "comidas", destination: "KITCHEN", iconName: "Utensils", orderIndex: 6 },
    { name: "Hamburguesas", slug: "hamburguesas", destination: "KITCHEN", iconName: "Sandwich", orderIndex: 7 },
    { name: "Pizzas", slug: "pizzas", destination: "KITCHEN", iconName: "Pizza", orderIndex: 8 },
    { name: "Picadas", slug: "picadas", destination: "KITCHEN", iconName: "UtensilsCrossed", orderIndex: 9 },
    { name: "Postres", slug: "postres", destination: "KITCHEN", iconName: "IceCream", orderIndex: 10 },
    { name: "Promociones", slug: "promociones", destination: "BOTH", iconName: "Sparkles", orderIndex: 11 },
    { name: "Productos especiales", slug: "productos-especiales", destination: "BOTH", iconName: "Crown", orderIndex: 12 },
  ];

  const categoryMap: Record<string, string> = {};
  for (const cat of categoriesData) {
    const created = await prisma.gastroCategory.upsert({
      where: { tenantId_slug: { tenantId, slug: cat.slug } },
      update: {},
      create: {
        tenantId,
        venueId: targetVenueId,
        name: cat.name,
        slug: cat.slug,
        destination: cat.destination,
        iconName: cat.iconName,
        orderIndex: cat.orderIndex,
        active: true,
      },
    });
    categoryMap[cat.slug] = created.id;
  }

  // 5. Crear Insumos e Ingredientes de Inventario (Fase 10: Insumos Fraccionables y Artículos de Reventa)
  const inventoryItemsData = [
    // Insumos de Cocina
    { code: "INS-PAN-BRI", name: "Pan Brioche de Hamburguesa", itemType: "SUPPLY", destination: "KITCHEN", category: "INGREDIENT", unit: "UN", currentStock: 80, minStock: 15, costPerUnitCents: 2500 },
    { code: "INS-CARNE-180", name: "Medallón Carne Vacuna 180g", itemType: "SUPPLY", destination: "KITCHEN", category: "INGREDIENT", unit: "UN", currentStock: 75, minStock: 15, costPerUnitCents: 11000 },
    { code: "INS-QUESO-CHE", name: "Feta Queso Cheddar", itemType: "SUPPLY", destination: "KITCHEN", category: "INGREDIENT", unit: "FETA", currentStock: 150, minStock: 25, costPerUnitCents: 1800 },
    { code: "INS-PANCETA", name: "Porción Panceta Ahumada", itemType: "SUPPLY", destination: "KITCHEN", category: "INGREDIENT", unit: "PORCION", currentStock: 90, minStock: 15, costPerUnitCents: 3500 },
    { code: "INS-VERDURAS", name: "Mix Lechuga, Tomate y Cebolla", itemType: "SUPPLY", destination: "KITCHEN", category: "INGREDIENT", unit: "PORCION", currentStock: 100, minStock: 20, costPerUnitCents: 1500 },
    { code: "INS-MASA-PIZ", name: "Prepizza Artesanal 8 Porciones", itemType: "SUPPLY", destination: "KITCHEN", category: "INGREDIENT", unit: "UN", currentStock: 50, minStock: 10, costPerUnitCents: 7000 },
    { code: "INS-MUZZA", name: "Queso Muzzarella (250g)", itemType: "SUPPLY", destination: "KITCHEN", category: "INGREDIENT", unit: "PORCION", currentStock: 60, minStock: 12, costPerUnitCents: 9500 },
    
    // Insumos Fraccionables de Barra (Mililitros - ml)
    { code: "INS-GIN-TAN", name: "Gin Tanqueray (Fraccionable Tragos)", itemType: "SUPPLY", destination: "BAR", category: "BEVERAGE", unit: "ML", currentStock: 3000, minStock: 500, costPerUnitCents: 120 },
    { code: "INS-TONICA", name: "Agua Tónica Premium (Fraccionable)", itemType: "SUPPLY", destination: "BAR", category: "BEVERAGE", unit: "ML", currentStock: 8000, minStock: 1000, costPerUnitCents: 30 },
    { code: "INS-FERNET-BRA", name: "Fernet Branca (Fraccionable Tragos)", itemType: "SUPPLY", destination: "BAR", category: "BEVERAGE", unit: "ML", currentStock: 3000, minStock: 500, costPerUnitCents: 110 },
    { code: "INS-COCA-COLA", name: "Gaseosa Coca-Cola (Fraccionable)", itemType: "SUPPLY", destination: "BAR", category: "BEVERAGE", unit: "ML", currentStock: 10000, minStock: 2000, costPerUnitCents: 20 },
    { code: "INS-VODKA-ABS", name: "Vodka Absolut (Fraccionable Tragos)", itemType: "SUPPLY", destination: "BAR", category: "BEVERAGE", unit: "ML", currentStock: 3000, minStock: 500, costPerUnitCents: 130 },
    
    // Artículos de Reventa / Unidades Cerradas (UN)
    { code: "ART-SPEED-250", name: "Lata Speed Energy Drink 250ml", itemType: "ARTICLE", destination: "BAR", category: "BEVERAGE", unit: "UN", currentStock: 120, minStock: 24, costPerUnitCents: 7500 },
    { code: "ART-CORONA-BOT", name: "Cerveza Corona 355ml Botella", itemType: "ARTICLE", destination: "BAR", category: "BEVERAGE", unit: "UN", currentStock: 96, minStock: 20, costPerUnitCents: 10000 },
    { code: "INS-HIELO-BAL", name: "Balde de Hielo Cristalino", itemType: "SUPPLY", destination: "BOTH", category: "OTHER", unit: "UN", currentStock: 50, minStock: 10, costPerUnitCents: 3000 },
  ];

  const invMap: Record<string, string> = {};
  for (const inv of inventoryItemsData) {
    const item = await prisma.gastroInventoryItem.upsert({
      where: { tenantId_code: { tenantId, code: inv.code } },
      update: {
        itemType: inv.itemType,
        destination: inv.destination,
      },
      create: {
        tenantId,
        venueId: targetVenueId,
        code: inv.code,
        name: inv.name,
        itemType: inv.itemType,
        destination: inv.destination,
        category: inv.category,
        unit: inv.unit,
        currentStock: inv.currentStock,
        minStock: inv.minStock,
        costPerUnitCents: inv.costPerUnitCents,
        active: true,
      },
    });
    invMap[inv.code] = item.id;
  }

  // 6. Crear Productos del Menú Digital (Fase 2 & Fase 10)
  const productsData = [
    {
      code: "CER-001",
      name: "Cerveza Munich 500 ml",
      categorySlug: "cervezas",
      description: "Cerveza rubia lager tirada o en botella de 500 ml, servida ultra fría.",
      presentation: "500 ml",
      priceCents: 25000,
      costCents: 11000,
      stockQuantity: 120,
      minStockQuantity: 24,
      unit: "UN",
      destination: "BAR",
      isFeatured: true,
      imageUrl: "https://images.unsplash.com/photo-1608270586620-248524c67de9?w=600&auto=format&fit=crop&q=80",
      optionsJson: JSON.stringify([
        { id: "manija-congelada", name: "Manija congelada", priceCents: 0 },
        { id: "rodaja-limon", name: "Con rodaja de limón", priceCents: 2000 },
      ]),
    },
    {
      code: "CER-002",
      name: "Cerveza Corona Extra 355 ml",
      categorySlug: "cervezas",
      description: "Cerveza mexicana importada botella 355 ml acompañada con gajo de lima.",
      presentation: "Botella 355 ml",
      priceCents: 22000,
      costCents: 10000,
      stockQuantity: 96,
      minStockQuantity: 20,
      unit: "UN",
      destination: "BAR",
      isFeatured: false,
      imageUrl: "https://images.unsplash.com/photo-1518176258769-f227c798150e?w=600&auto=format&fit=crop&q=80",
      optionsJson: JSON.stringify([
        { id: "limon-extra", name: "Lima extra", priceCents: 2000 },
      ]),
    },
    {
      code: "BEB-001",
      name: "Agua Mineral con/sin Gas 500 ml",
      categorySlug: "bebidas",
      description: "Agua mineral natural en botella individual.",
      presentation: "500 ml",
      priceCents: 10000,
      costCents: 3500,
      stockQuantity: 150,
      minStockQuantity: 30,
      unit: "UN",
      destination: "BAR",
      isFeatured: false,
      imageUrl: "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=600&auto=format&fit=crop&q=80",
      optionsJson: JSON.stringify([
        { id: "hielo-limon", name: "Con hielo y limón", priceCents: 0 },
      ]),
    },
    {
      code: "BEB-002",
      name: "Gaseosa Coca-Cola Original 500 ml",
      categorySlug: "bebidas",
      description: "Gaseosa línea Coca-Cola bien helada con vaso y hielo.",
      presentation: "500 ml",
      priceCents: 15000,
      costCents: 6000,
      stockQuantity: 140,
      minStockQuantity: 25,
      unit: "UN",
      destination: "BAR",
      isFeatured: false,
      imageUrl: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80",
      optionsJson: null,
    },
    {
      code: "TRA-001",
      name: "Fernet Branca con Coca",
      categorySlug: "tragos",
      description: "Medida generosa de Fernet Branca con Coca-Cola y hielo rolo en vaso largo.",
      presentation: "Vaso 500 ml",
      priceCents: 35000,
      costCents: 13000,
      stockQuantity: 85,
      minStockQuantity: 15,
      unit: "UN",
      destination: "BAR",
      isFeatured: true,
      imageUrl: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=600&auto=format&fit=crop&q=80",
      optionsJson: JSON.stringify([
        { id: "medida-doble", name: "Medida doble", priceCents: 15000 },
      ]),
    },
    {
      code: "COC-001",
      name: "Gin Tonic Tanqueray Frutos Rojos",
      categorySlug: "cocteles",
      description: "Gin Tanqueray, agua tónica premium, mix de frutos rojos y botánicos.",
      presentation: "Copón 450 ml",
      priceCents: 45000,
      costCents: 18000,
      stockQuantity: 60,
      minStockQuantity: 10,
      unit: "UN",
      destination: "BAR",
      isFeatured: true,
      imageUrl: "https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=600&auto=format&fit=crop&q=80",
      optionsJson: JSON.stringify([
        { id: "tonica-zero", name: "Con Tónica Zero", priceCents: 0 },
      ]),
    },
    {
      code: "VIN-001",
      name: "Vino Malbec Reserva 750 ml",
      categorySlug: "vinos",
      description: "Vino tinto Malbec Reserva de Mendoza con crianza en roble francés.",
      presentation: "Botella 750 ml",
      priceCents: 120000,
      costCents: 55000,
      stockQuantity: 35,
      minStockQuantity: 6,
      unit: "UN",
      destination: "BAR",
      isFeatured: false,
      imageUrl: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&auto=format&fit=crop&q=80",
      optionsJson: null,
    },
    {
      code: "COM-001",
      name: "Lomito Árabe Completo con Papas",
      categorySlug: "comidas",
      description: "Lomo vacuno grillado, queso derretido, jamón, vegetales frescos y salsa de ajo con papas fritas.",
      presentation: "Individual con guarnición",
      priceCents: 48000,
      costCents: 21000,
      stockQuantity: 50,
      minStockQuantity: 10,
      unit: "UN",
      destination: "KITCHEN",
      isFeatured: false,
      imageUrl: "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=600&auto=format&fit=crop&q=80",
      optionsJson: JSON.stringify([
        { id: "huevo-plancha", name: "Huevo a la plancha", priceCents: 5000 },
        { id: "salsa-ajo-extra", name: "Salsa de ajo extra", priceCents: 3000 },
      ]),
    },
    {
      code: "HAM-001",
      name: "Hamburguesa especial",
      categorySlug: "hamburguesas",
      description: "Hamburguesa artesanal en pan brioche con medallón de carne 180g, queso cheddar, panceta crocante y verduras frescas.",
      presentation: "Con papas rústicas (380g)",
      priceCents: 55000,
      costCents: 22000,
      stockQuantity: 60,
      minStockQuantity: 10,
      unit: "UN",
      destination: "KITCHEN",
      hasRecipe: true,
      isFeatured: true,
      imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80",
      optionsJson: JSON.stringify([
        { id: "queso", name: "Queso extra", priceCents: 5000 },
        { id: "panceta", name: "Panceta extra", priceCents: 8000 },
        { id: "doble-carne", name: "Doble medallón de carne", priceCents: 18000 },
      ]),
    },
    {
      code: "PIZ-001",
      name: "Pizza Napolitana Muzzarella & Albahaca",
      categorySlug: "pizzas",
      description: "Pizza a la piedra de 8 porciones con salsa de tomates naturales, abundante muzzarella, rodajas de tomate y ajo.",
      presentation: "Grande 8 porciones",
      priceCents: 75000,
      costCents: 28000,
      stockQuantity: 45,
      minStockQuantity: 8,
      unit: "UN",
      destination: "KITCHEN",
      hasRecipe: true,
      isFeatured: true,
      imageUrl: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600&auto=format&fit=crop&q=80",
      optionsJson: JSON.stringify([
        { id: "borde-relleno", name: "Borde relleno de queso", priceCents: 15000 },
        { id: "extra-pepperoni", name: "Topping de Pepperoni", priceCents: 12000 },
      ]),
    },
    {
      code: "PIC-001",
      name: "Tabla Picada Caliente & Fría (4 Personas)",
      categorySlug: "picadas",
      description: "Cubos de lomito, mandioca frita, papas con cheddar, chorizo gourmet, jamón crudo, quesos seleccionados y aceitunas.",
      presentation: "Tabla para 4 personas",
      priceCents: 135000,
      costCents: 58000,
      stockQuantity: 30,
      minStockQuantity: 5,
      unit: "UN",
      destination: "KITCHEN",
      isFeatured: true,
      imageUrl: "https://images.unsplash.com/photo-1541529086526-db283c563270?w=600&auto=format&fit=crop&q=80",
      optionsJson: JSON.stringify([
        { id: "porcion-mandioca", name: "Porción extra mandioca", priceCents: 10000 },
      ]),
    },
    {
      code: "POS-001",
      name: "Volcán de Chocolate con Helado",
      categorySlug: "postres",
      description: "Bizcocho tibio de chocolate belga con centro fundido acompañado de helado de crema americana.",
      presentation: "Porción individual",
      priceCents: 32000,
      costCents: 12000,
      stockQuantity: 25,
      minStockQuantity: 5,
      unit: "UN",
      destination: "KITCHEN",
      isFeatured: false,
      imageUrl: "https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=600&auto=format&fit=crop&q=80",
      optionsJson: null,
    },
    {
      code: "PRO-001",
      name: "Combo Amigos: Balde 6 Cervezas + Tabla Picada",
      categorySlug: "promociones",
      description: "Balde con 6 cervezas bien frías + Tabla de picada caliente con papas cheddar y lomito.",
      presentation: "Combo Grupal (4-6 personas)",
      priceCents: 210000,
      costCents: 92000,
      stockQuantity: 25,
      minStockQuantity: 5,
      unit: "UN",
      destination: "BOTH",
      isFeatured: true,
      isPromotion: true,
      imageUrl: "https://images.unsplash.com/photo-1575037614876-c38a4d44f5b8?w=600&auto=format&fit=crop&q=80",
      optionsJson: null,
    },
    {
      code: "ESP-001",
      name: "Botella Whisky Johnnie Walker Black Label + 4 Energizantes",
      categorySlug: "productos-especiales",
      description: "Servicio VIP en mesa o camarote con hielo cristalino y 4 latas de energizante.",
      presentation: "Botella 750 ml + 4 latas",
      priceCents: 450000,
      costCents: 210000,
      stockQuantity: 15,
      minStockQuantity: 3,
      unit: "UN",
      destination: "BAR",
      isFeatured: true,
      imageUrl: "https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=600&auto=format&fit=crop&q=80",
      optionsJson: JSON.stringify([
        { id: "bengala-vip", name: "Servicio con Bengala VIP", priceCents: 0 },
      ]),
    },
  ];

  const createdProducts: Record<string, string> = {};
  for (const prod of productsData) {
    const p = await prisma.gastroProduct.upsert({
      where: { tenantId_code: { tenantId, code: prod.code } },
      update: {},
      create: {
        tenantId,
        venueId: targetVenueId,
        categoryId: categoryMap[prod.categorySlug],
        code: prod.code,
        name: prod.name,
        description: prod.description,
        presentation: prod.presentation,
        priceCents: prod.priceCents,
        costCents: prod.costCents,
        currency: "PYG",
        stockQuantity: prod.stockQuantity,
        minStockQuantity: prod.minStockQuantity,
        unit: prod.unit,
        trackInventory: true,
        hasRecipe: Boolean(prod.hasRecipe),
        destination: prod.destination,
        availabilityStatus: "AVAILABLE",
        active: true,
        isFeatured: prod.isFeatured,
        isPromotion: Boolean(prod.isPromotion),
        imageUrl: prod.imageUrl,
        optionsJson: prod.optionsJson,
      },
    });
    createdProducts[prod.code] = p.id;
  }

  // 7. Vincular Receta de Hamburguesa especial (Fase 10: Pan, Carne, Queso, Panceta, Verduras)
  const burgerId = createdProducts["HAM-001"];
  if (burgerId) {
    const burgerRecipe = [
      { invCode: "INS-PAN-BRI", qty: 1 },
      { invCode: "INS-CARNE-180", qty: 1 },
      { invCode: "INS-QUESO-CHE", qty: 2 },
      { invCode: "INS-PANCETA", qty: 1 },
      { invCode: "INS-VERDURAS", qty: 1 },
    ];
    for (const r of burgerRecipe) {
      const invId = invMap[r.invCode];
      if (invId) {
        await prisma.gastroProductRecipeItem.upsert({
          where: { productId_inventoryItemId: { productId: burgerId, inventoryItemId: invId } },
          update: { quantityRequired: r.qty },
          create: {
            productId: burgerId,
            inventoryItemId: invId,
            quantityRequired: r.qty,
          },
        });
      }
    }
  }

  // Vincular Receta de Pizza Napolitana
  const pizzaId = createdProducts["PIZ-001"];
  if (pizzaId) {
    const pizzaRecipe = [
      { invCode: "INS-MASA-PIZ", qty: 1 },
      { invCode: "INS-MUZZA", qty: 1 },
    ];
    for (const r of pizzaRecipe) {
      const invId = invMap[r.invCode];
      if (invId) {
        await prisma.gastroProductRecipeItem.upsert({
          where: { productId_inventoryItemId: { productId: pizzaId, inventoryItemId: invId } },
          update: { quantityRequired: r.qty },
          create: {
            productId: pizzaId,
            inventoryItemId: invId,
            quantityRequired: r.qty,
          },
        });
      }
    }
  }

  // Vincular Receta de Bar: Gin Tonic Tanqueray (Descuento en mililitros ml)
  const ginTonicId = createdProducts["COC-001"];
  if (ginTonicId) {
    await prisma.gastroProduct.update({ where: { id: ginTonicId }, data: { hasRecipe: true } });
    const ginRecipe = [
      { invCode: "INS-GIN-TAN", qty: 50 },  // 50 ml de Gin
      { invCode: "INS-TONICA", qty: 200 },  // 200 ml de Tónica
    ];
    for (const r of ginRecipe) {
      const invId = invMap[r.invCode];
      if (invId) {
        await prisma.gastroProductRecipeItem.upsert({
          where: { productId_inventoryItemId: { productId: ginTonicId, inventoryItemId: invId } },
          update: { quantityRequired: r.qty },
          create: { productId: ginTonicId, inventoryItemId: invId, quantityRequired: r.qty },
        });
      }
    }
  }

  // Vincular Receta de Bar: Fernet con Coca (Descuento en mililitros ml)
  const fernetId = createdProducts["TRA-001"];
  if (fernetId) {
    await prisma.gastroProduct.update({ where: { id: fernetId }, data: { hasRecipe: true } });
    const fernetRecipe = [
      { invCode: "INS-FERNET-BRA", qty: 60 },  // 60 ml de Fernet
      { invCode: "INS-COCA-COLA", qty: 200 },  // 200 ml de Coca-Cola
    ];
    for (const r of fernetRecipe) {
      const invId = invMap[r.invCode];
      if (invId) {
        await prisma.gastroProductRecipeItem.upsert({
          where: { productId_inventoryItemId: { productId: fernetId, inventoryItemId: invId } },
          update: { quantityRequired: r.qty },
          create: { productId: fernetId, inventoryItemId: invId, quantityRequired: r.qty },
        });
      }
    }
  }

  // Vincular Receta de Combo: Combo Amigos (Descuenta artículos en UN e insumos)
  const comboId = createdProducts["PRO-001"];
  if (comboId) {
    await prisma.gastroProduct.update({ where: { id: comboId }, data: { hasRecipe: true } });
    const comboRecipe = [
      { invCode: "ART-CORONA-BOT", qty: 6 }, // 6 botellas de Corona
      { invCode: "INS-HIELO-BAL", qty: 1 },  // 1 balde de hielo
    ];
    for (const r of comboRecipe) {
      const invId = invMap[r.invCode];
      if (invId) {
        await prisma.gastroProductRecipeItem.upsert({
          where: { productId_inventoryItemId: { productId: comboId, inventoryItemId: invId } },
          update: { quantityRequired: r.qty },
          create: { productId: comboId, inventoryItemId: invId, quantityRequired: r.qty },
        });
      }
    }
  }

  // 8. Crear Usuarios Operativos Gastronómicos si no existen (Fase 14)
  const passwordHash = await bcrypt.hash("Password123!", 10);
  const staffRoles = [
    { email: "cajero@retrobar.com", name: "Lucía Benítez (Caja)", role: "CAJERO" },
    { email: "jefebarra@retrobar.com", name: "Martín Duarte (Encargado Barra)", role: "ENCARGADO_BARRA" },
    { email: "barra@retrobar.com", name: "Diego Rojas (Bartender)", role: "OPERADOR_BARRA" },
    { email: "jefecocina@retrobar.com", name: "Chef Roberto Ayala (Jefe Cocina)", role: "ENCARGADO_COCINA" },
    { email: "cocina@retrobar.com", name: "Sofía Villalba (Cocinera)", role: "COCINERO" },
    { email: "mozo1@retrobar.com", name: "Juan Pérez (Mozo Salón)", role: "MOZO" },
    { email: "mozo2@retrobar.com", name: "Mateo Giménez (Mozo Terraza)", role: "MOZO" },
    { email: "auditor@retrobar.com", name: "Contadora Elena Ortíz (Auditor)", role: "AUDITOR" },
  ];

  for (const sr of staffRoles) {
    await prisma.user.upsert({
      where: { email: sr.email },
      update: {},
      create: {
        email: sr.email,
        passwordHash,
        name: sr.name,
        role: sr.role,
        status: "ACTIVE",
        tenantId,
      },
    });
  }

  return { seeded: true, venueId: targetVenueId };
}
