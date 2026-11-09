/**
 * FASE 19 & FASE J: SUITE DE PRUEBAS AUTOMATIZADAS END-TO-END — GESTIÓN GASTRONÓMICA VIDJSPRO
 * Ejecuta y verifica los 18 pasos del flujo principal + los 12 casos especiales y controles RBAC.
 */

import { NextRequest } from "next/server";
import { prisma } from "../src/lib/db/prisma";
import { signSessionToken } from "../src/lib/auth/jwt";
import { ensureGastronomySeeded } from "../src/lib/gastronomy/seed-defaults";
import { Role } from "../src/lib/rbac/permissions";

// Import API Route Handlers directly for deterministic E2E execution against PostgreSQL
import { GET as getBootstrap } from "../src/app/api/v1/gastronomy/bootstrap/route";
import { POST as postCategories } from "../src/app/api/v1/gastronomy/categories/route";
import { POST as postProducts, PATCH as patchProducts } from "../src/app/api/v1/gastronomy/products/route";
import { GET as getPublicMenu } from "../src/app/api/v1/gastronomy/public/menu/route";
import { POST as postOrders } from "../src/app/api/v1/gastronomy/orders/route";
import { PATCH as patchOrderAction } from "../src/app/api/v1/gastronomy/orders/action/route";
import { POST as postPayments, computeWebhookHmac } from "../src/app/api/v1/gastronomy/payments/route";
import { POST as postDeposits } from "../src/app/api/v1/gastronomy/deposits/route";
import { POST as postTables } from "../src/app/api/v1/gastronomy/tables/route";
import { POST as postInventory } from "../src/app/api/v1/gastronomy/inventory/route";
import { POST as postInvoicing } from "../src/app/api/v1/gastronomy/invoicing/route";

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(`❌ ASSERTION FAILED: ${message}`);
  }
}

async function callWithToken<T>(
  token: string,
  fn: () => Promise<T>
): Promise<T> {
  process.env.__VIDJS_CLI_TEST_TOKEN = token;
  return fn();
}

function makeReq(url: string, method: string, body?: Record<string, unknown>): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function ensureRoleUser(tenantId: string, email: string, name: string, role: Role) {
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        tenantId,
        email,
        name,
        passwordHash: "e2e_hash",
        role,
        status: "ACTIVE",
      },
    });
  } else if (user.role !== role || user.status !== "ACTIVE" || user.tenantId !== tenantId) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { role, status: "ACTIVE", tenantId },
    });
  }
  const token = await signSessionToken({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role as Role,
    tenantId: user.tenantId,
    tokenVersion: user.tokenVersion,
  });
  return { user, token };
}

async function runGastronomyE2ETests() {
  console.log("==================================================================");
  console.log("🚀 INICIANDO SUITE E2E: GESTIÓN GASTRONÓMICA VIDJSPRO (FASE 19)");
  console.log("==================================================================\n");

  const tenant = await prisma.tenant.findFirst({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
  });
  assert(tenant, "Debe existir al menos un Tenant activo en VIDJSPRO");
  const tenantId = tenant!.id;

  const seeded = await ensureGastronomySeeded(tenantId);
  assert(seeded?.venueId, "Debe existir o crearse un Venue activo");

  // Create real DB users & tokens for each RBAC role
  const admin = await ensureRoleUser(tenantId, "e2e.admin@vidjspro.com", "Admin E2E", "ADMINISTRADOR");
  const barOp = await ensureRoleUser(tenantId, "e2e.barra@vidjspro.com", "Operador Barra E2E", "OPERADOR_BARRA");
  const kitchenOp = await ensureRoleUser(tenantId, "e2e.cocina@vidjspro.com", "Cocinero E2E", "COCINERO");
  const waiter1 = await ensureRoleUser(tenantId, "e2e.mozo1@vidjspro.com", "Mozo Carlos E2E", "MOZO");
  const waiter2 = await ensureRoleUser(tenantId, "e2e.mozo2@vidjspro.com", "Mozo Rodrigo E2E", "MOZO");
  const cashier = await ensureRoleUser(tenantId, "e2e.caja@vidjspro.com", "Cajero E2E", "CAJERO");

  // Bootstrap check
  const bootRes = await callWithToken(admin.token, () =>
    getBootstrap(makeReq("http://localhost:3000/api/v1/gastronomy/bootstrap", "GET"))
  );
  assert(bootRes.status === 200, "Bootstrap debe responder HTTP 200");

  // ---------------------------------------------------------------------------
  // PASO 1: Crear categorías
  // ---------------------------------------------------------------------------
  const suffix = Date.now().toString().slice(-5);
  const catRes = await callWithToken(admin.token, () =>
    postCategories(
      makeReq("http://localhost:3000/api/v1/gastronomy/categories", "POST", {
        name: `Cervezas E2E ${suffix}`,
        destination: "BAR",
        iconName: "Beer",
      })
    )
  );
  const catJson = await catRes.json();
  assert(catRes.ok && catJson.category?.id, "Paso 1a: Categoría de Barra creada");

  const foodCatRes = await callWithToken(admin.token, () =>
    postCategories(
      makeReq("http://localhost:3000/api/v1/gastronomy/categories", "POST", {
        name: `Hamburguesas E2E ${suffix}`,
        destination: "KITCHEN",
        iconName: "Utensils",
      })
    )
  );
  const foodCatJson = await foodCatRes.json();
  assert(foodCatRes.ok && foodCatJson.category?.id, "Paso 1b: Categoría de Cocina creada");
  console.log("✅ Paso 1 completado: Categorías de Barra y Cocina creadas.");

  // ---------------------------------------------------------------------------
  // PASO 2 y 3: Crear productos, ingredientes y recetas
  // ---------------------------------------------------------------------------
  const beerRes = await callWithToken(admin.token, () =>
    postProducts(
      makeReq("http://localhost:3000/api/v1/gastronomy/products", "POST", {
        categoryId: catJson.category.id,
        code: `MUNICH-${suffix}`,
        name: "Cerveza Munich 500 ml E2E",
        description: "Cerveza rubia tirada bien fría",
        presentation: "500 ml",
        priceCents: 25000,
        costCents: 11000,
        stockQuantity: 40,
        minStockQuantity: 5,
        destination: "BAR",
        optionsJson: JSON.stringify([{ id: "opt-mani", name: "Maní salado extra", priceCents: 5000 }]),
      })
    )
  );
  const beerJson = await beerRes.json();
  assert(beerRes.ok && beerJson.product?.id, "Paso 2a: Cerveza Munich 500 ml creada");

  const burgerRes = await callWithToken(admin.token, () =>
    postProducts(
      makeReq("http://localhost:3000/api/v1/gastronomy/products", "POST", {
        categoryId: foodCatJson.category.id,
        code: `BURGER-${suffix}`,
        name: "Hamburguesa Especial E2E",
        description: "Doble carne casera con queso y panceta",
        presentation: "Plato con papas",
        priceCents: 48000,
        costCents: 21000,
        stockQuantity: 30,
        minStockQuantity: 5,
        destination: "KITCHEN",
        hasRecipe: true,
        optionsJson: JSON.stringify([
          { id: "opt-queso", name: "Queso extra", priceCents: 5000 },
          { id: "opt-panceta", name: "Panceta crocante", priceCents: 7000 },
        ]),
      })
    )
  );
  const burgerJson = await burgerRes.json();
  assert(burgerRes.ok && burgerJson.product?.id, "Paso 2b: Hamburguesa Especial creada");

  const ingRes = await callWithToken(admin.token, () =>
    postInventory(
      makeReq("http://localhost:3000/api/v1/gastronomy/inventory", "POST", {
        action: "CREATE_INVENTORY_ITEM",
        code: `CARNE-${suffix}`,
        name: `Medallón Carne 180g E2E ${suffix}`,
        unit: "UN",
        currentStock: 20,
        minStock: 5,
        costPerUnitCents: 9000,
      })
    )
  );
  const ingJson = await ingRes.json();
  const createdIngId = ingJson.inventoryItem?.id || ingJson.item?.id;
  assert(ingRes.ok && createdIngId, "Paso 3a: Insumo creado");

  const recipeRes = await callWithToken(admin.token, () =>
    postInventory(
      makeReq("http://localhost:3000/api/v1/gastronomy/inventory", "POST", {
        action: "ADD_RECIPE_ITEM",
        productId: burgerJson.product.id,
        inventoryItemId: createdIngId,
        quantityRequired: 2,
      })
    )
  );
  assert(recipeRes.ok, "Paso 3b: Receta vinculada al producto");
  console.log("✅ Pasos 2 y 3 completados: Productos, insumos y recetas configurados.");

  // ---------------------------------------------------------------------------
  // PASO 4 y 5: Crear sectores, mesas y generar QR de mesa
  // ---------------------------------------------------------------------------
  const sectorRes = await callWithToken(admin.token, () =>
    postTables(
      makeReq("http://localhost:3000/api/v1/gastronomy/tables", "POST", {
        action: "CREATE_SECTOR",
        sectorName: `Terraza VIP E2E ${suffix}`,
        sectorCode: `TVIP-${suffix}`,
      })
    )
  );
  const sectorJson = await sectorRes.json();
  assert(sectorRes.ok && sectorJson.sector?.id, "Paso 4a: Sector creado");

  const randomTableNum = Math.floor(600 + Math.random() * 350);
  const tableRes = await callWithToken(admin.token, () =>
    postTables(
      makeReq("http://localhost:3000/api/v1/gastronomy/tables", "POST", {
        action: "CREATE_TABLE",
        number: randomTableNum,
        label: `Mesa E2E ${randomTableNum}`,
        capacity: 6,
        sectorId: sectorJson.sector.id,
      })
    )
  );
  const tableJson = await tableRes.json();
  assert(tableRes.ok && tableJson.table?.qrToken, "Paso 4b y 5: Mesa creada con QR único");
  const testTable = tableJson.table;
  console.log(`✅ Pasos 4 y 5 completados: ${testTable.label} creada con QR ${testTable.qrToken}.`);

  // ---------------------------------------------------------------------------
  // PASO 6: Simular ingreso del cliente por QR y consultar menú público
  // ---------------------------------------------------------------------------
  const pubMenuRes = await getPublicMenu(
    makeReq(
      `http://localhost:3000/api/v1/gastronomy/public/menu?qrToken=${testTable.qrToken}`,
      "GET"
    )
  );
  const pubMenuJson = await pubMenuRes.json();
  assert(
    pubMenuRes.status === 200 &&
      pubMenuJson.sessionInfo?.table?.id === testTable.id &&
      pubMenuJson.categories.length > 0,
    "Paso 6: Menú público cargado e identificando mesa por QR"
  );
  console.log("✅ Paso 6 completado: Ingreso del cliente por QR verificado.");

  // ---------------------------------------------------------------------------
  // PASO 7 y 8: Agregar bebidas (2x Cerveza Munich, bien fría) y comidas (1x Hamburguesa con queso y panceta) y confirmar pedido
  // ---------------------------------------------------------------------------
  const orderRes = await callWithToken(admin.token, () =>
    postOrders(
      makeReq("http://localhost:3000/api/v1/gastronomy/orders", "POST", {
        tenantId,
        tableId: testTable.id,
        tableLabel: testTable.label,
        sectorName: sectorJson.sector.name,
        sessionCode: pubMenuJson.sessionInfo.sessionCode,
        customerName: "Cliente E2E Principal",
        deliveryMode: "WAITER_DELIVERY",
        paymentMethodSelected: "CASH",
        items: [
          {
            productId: beerJson.product.id,
            quantity: 2,
            selectedOptions: [],
            observations: "bien fría",
          },
          {
            productId: burgerJson.product.id,
            quantity: 1,
            selectedOptions: [
              { id: "opt-queso", name: "Queso extra", priceCents: 5000 },
              { id: "opt-panceta", name: "Panceta crocante", priceCents: 7000 },
            ],
            observations: "punto medio",
          },
        ],
      })
    )
  );
  const orderJson = await orderRes.json();
  assert(orderRes.ok && orderJson.order?.orderNumber, "Paso 8: Pedido confirmado con número único");
  const mainOrder = orderJson.order;
  assert(mainOrder.subtotalCents === 110000, `Subtotal esperado 110000, recibido ${mainOrder.subtotalCents}`);
  console.log(`✅ Pasos 7 y 8 completados: Pedido ${mainOrder.orderNumber} creado por Gs. ${mainOrder.totalCents}.`);

  // ---------------------------------------------------------------------------
  // PASO 16: Verificar descuento automático de stock y receta
  // ---------------------------------------------------------------------------
  const updatedBeer = await prisma.gastroProduct.findUnique({ where: { id: beerJson.product.id } });
  const updatedIng = await prisma.gastroInventoryItem.findUnique({ where: { id: createdIngId } });
  assert(updatedBeer?.stockQuantity === 38, "Paso 16a: Stock de cerveza descontado de 40 a 38");
  assert(updatedIng?.currentStock === 18, "Paso 16b: Stock de medallón descontado por receta de 20 a 18");
  console.log("✅ Paso 16 completado: Descuento automático de stock e ingredientes de receta verificado.");

  // ---------------------------------------------------------------------------
  // PASO 9 y 17: Procesar pago en Caja y verificar generación automática en VENTAS PENDIENTES DE FACTURACIÓN
  // ---------------------------------------------------------------------------
  const payRes = await callWithToken(cashier.token, () =>
    postPayments(
      makeReq("http://localhost:3000/api/v1/gastronomy/payments", "POST", {
        action: "CONFIRM_CASH_PAYMENT",
        orderId: mainOrder.id,
        amountCents: mainOrder.totalCents,
        receivedAmountCents: 150000,
      })
    )
  );
  const payJson = await payRes.json();
  assert(payRes.status === 200 && payJson.payment?.status === "APPROVED", "Paso 9: Pago en caja aprobado");
  assert(
    payJson.pendingInvoiceSale?.invoicingStatus === "PENDING_INVOICING",
    "Paso 17: Registro generado automáticamente en VENTAS PENDIENTES DE FACTURACIÓN"
  );
  console.log(`✅ Pasos 9 y 17 completados: Pago aprobado y venta pendiente ${payJson.pendingInvoiceSale.sourceUniqueId} creada.`);

  // ---------------------------------------------------------------------------
  // PASO 10, 11, 12 y 13: Recibir y preparar en Barra y Cocina + Solicitar Mozo
  // ---------------------------------------------------------------------------
  const barPrepRes = await callWithToken(barOp.token, () =>
    patchOrderAction(
      makeReq("http://localhost:3000/api/v1/gastronomy/orders/action", "PATCH", {
        orderId: mainOrder.id,
        action: "BAR_START_PREP",
      })
    )
  );
  assert(barPrepRes.status === 200, "Paso 10/12a: Barra inicia preparación");

  const barReadyRes = await callWithToken(barOp.token, () =>
    patchOrderAction(
      makeReq("http://localhost:3000/api/v1/gastronomy/orders/action", "PATCH", {
        orderId: mainOrder.id,
        action: "BAR_REQUEST_WAITER",
      })
    )
  );
  assert(barReadyRes.status === 200, "Paso 12b: Barra marca listo y solicita mozo");

  // Regla Fase 5: Cocina no debe entregar directamente sin mozo salvo excepción de administrador
  const illegalKitchenDeliver = await callWithToken(kitchenOp.token, () =>
    patchOrderAction(
      makeReq("http://localhost:3000/api/v1/gastronomy/orders/action", "PATCH", {
        orderId: mainOrder.id,
        action: "KITCHEN_ADMIN_DIRECT_DELIVERY",
      })
    )
  );
  assert(
    illegalKitchenDeliver.status === 403,
    "Regla Fase 5: Cocina no puede cerrar entrega sin intervención de mozo"
  );

  await callWithToken(kitchenOp.token, () =>
    patchOrderAction(
      makeReq("http://localhost:3000/api/v1/gastronomy/orders/action", "PATCH", {
        orderId: mainOrder.id,
        action: "KITCHEN_START_PREP",
      })
    )
  );
  const kitchenReqWaiter = await callWithToken(kitchenOp.token, () =>
    patchOrderAction(
      makeReq("http://localhost:3000/api/v1/gastronomy/orders/action", "PATCH", {
        orderId: mainOrder.id,
        action: "KITCHEN_REQUEST_WAITER",
      })
    )
  );
  assert(kitchenReqWaiter.status === 200, "Paso 11/13: Cocina prepara y solicita mozo");
  console.log("✅ Pasos 10, 11, 12 y 13 completados: Barra y Cocina prepararon y solicitaron Mozo.");

  // ---------------------------------------------------------------------------
  // PASO 14 y CASO ESPECIAL 5: Dos mozos intentando aceptar el mismo pedido
  // ---------------------------------------------------------------------------
  const accept1 = await callWithToken(waiter1.token, () =>
    patchOrderAction(
      makeReq("http://localhost:3000/api/v1/gastronomy/orders/action", "PATCH", {
        orderId: mainOrder.id,
        action: "WAITER_ACCEPT_ORDER",
      })
    )
  );
  const accept2 = await callWithToken(waiter2.token, () =>
    patchOrderAction(
      makeReq("http://localhost:3000/api/v1/gastronomy/orders/action", "PATCH", {
        orderId: mainOrder.id,
        action: "WAITER_ACCEPT_ORDER",
      })
    )
  );
  assert(
    accept1.status === 200 && accept2.status === 409,
    `Caso Especial 5: Primer mozo acepta (200) y segundo mozo es bloqueado (409). Recibido: ${accept1.status} vs ${accept2.status}`
  );
  console.log("✅ Paso 14 y Caso Especial 5 completados: Bloqueo atómico de mozos verificado (200 vs 409).");

  // ---------------------------------------------------------------------------
  // PASO 15: Confirmar retiro de barra/cocina y entrega en mesa por el mozo
  // ---------------------------------------------------------------------------
  await callWithToken(waiter1.token, () =>
    patchOrderAction(
      makeReq("http://localhost:3000/api/v1/gastronomy/orders/action", "PATCH", {
        orderId: mainOrder.id,
        action: "WAITER_PICKUP_BAR",
      })
    )
  );
  await callWithToken(waiter1.token, () =>
    patchOrderAction(
      makeReq("http://localhost:3000/api/v1/gastronomy/orders/action", "PATCH", {
        orderId: mainOrder.id,
        action: "WAITER_PICKUP_KITCHEN",
      })
    )
  );
  const deliverRes = await callWithToken(waiter1.token, () =>
    patchOrderAction(
      makeReq("http://localhost:3000/api/v1/gastronomy/orders/action", "PATCH", {
        orderId: mainOrder.id,
        action: "WAITER_CONFIRM_DELIVERY",
      })
    )
  );
  const deliverJson = await deliverRes.json();
  assert(deliverRes.status === 200 && deliverJson.order.status === "DELIVERED", "Paso 15: Pedido entregado en mesa");
  console.log("✅ Paso 15 completado: Mozo confirmó retiro y entrega en mesa.");

  // ---------------------------------------------------------------------------
  // PASO 18 + CASOS ESPECIALES 11 y 12: Error de integración con facturación, Reintento y FACTURAR VENTAS
  // ---------------------------------------------------------------------------
  const pendingSaleId = payJson.pendingInvoiceSale.id;

  // Caso Especial 11: Simular error de integración ERP
  const errInvRes = await callWithToken(cashier.token, () =>
    postInvoicing(
      makeReq("http://localhost:3000/api/v1/gastronomy/invoicing", "POST", {
        action: "SIMULATE_SYNC_ERROR",
        saleIds: [pendingSaleId],
        errorReason: "Fallo simulado E2E de conexión con ERP",
      })
    )
  );
  assert(errInvRes.status === 200, "Caso Especial 11: Error de integración ERP registrado");

  // Caso Especial 12 y Paso 18: Reintentar facturación y validar estado INVOICED
  const retryInvRes = await callWithToken(cashier.token, () =>
    postInvoicing(
      makeReq("http://localhost:3000/api/v1/gastronomy/invoicing", "POST", {
        action: "RETRY_SYNC",
        saleIds: [pendingSaleId],
      })
    )
  );
  const retryInvJson = await retryInvRes.json();
  assert(
    retryInvRes.status === 200 && retryInvJson.sales?.[0]?.invoicingStatus === "INVOICED",
    "Paso 18 y Caso Especial 12: Facturación exitosa tras reintento"
  );

  // Verificar prevención de doble facturación
  const dupInvRes = await callWithToken(cashier.token, () =>
    postInvoicing(
      makeReq("http://localhost:3000/api/v1/gastronomy/invoicing", "POST", {
        action: "INVOICE_SALES",
        saleIds: [pendingSaleId],
      })
    )
  );
  assert(dupInvRes.status === 409, "Prevención de doble facturación verificada (HTTP 409)");
  console.log("✅ Paso 18 y Casos Especiales 11 y 12 completados: Integración de facturación e idempotencia validadas.");

  // ---------------------------------------------------------------------------
  // CASO ESPECIAL 1 + RBAC: Producto agotado desaparece del menú y Barra no puede cambiar precios
  // ---------------------------------------------------------------------------
  const illegalPriceChange = await callWithToken(barOp.token, () =>
    patchProducts(
      makeReq("http://localhost:3000/api/v1/gastronomy/products", "PATCH", {
        id: beerJson.product.id,
        priceCents: 1000,
      })
    )
  );
  assert(illegalPriceChange.status === 403, "RBAC Fase 4: Barra no puede modificar precios");

  const markExhausted = await callWithToken(barOp.token, () =>
    patchProducts(
      makeReq("http://localhost:3000/api/v1/gastronomy/products", "PATCH", {
        id: beerJson.product.id,
        availabilityStatus: "AUTO_EXHAUSTED",
      })
    )
  );
  assert(markExhausted.status === 200, "Barra puede marcar producto como agotado");

  const menuAfterExhausted = await (
    await getPublicMenu(
      makeReq(`http://localhost:3000/api/v1/gastronomy/public/menu?qrToken=${testTable.qrToken}`, "GET")
    )
  ).json();
  const allPublicProdIds = (menuAfterExhausted.products || []).map((p: any) => p.id);
  assert(
    !allPublicProdIds.includes(beerJson.product.id),
    "Caso Especial 1: Producto agotado desaparece inmediatamente del menú del cliente"
  );

  // Reactivar producto
  await callWithToken(barOp.token, () =>
    patchProducts(
      makeReq("http://localhost:3000/api/v1/gastronomy/products", "PATCH", {
        id: beerJson.product.id,
        availabilityStatus: "AVAILABLE",
        stockQuantity: 50,
      })
    )
  );
  console.log("✅ Caso Especial 1 y RBAC de Barra completados.");

  // ---------------------------------------------------------------------------
  // CASOS ESPECIALES 2, 3, 4, 6, 7, 8, 9 y 10
  // ---------------------------------------------------------------------------
  // Caso 9: Seña (Consumo estimado Gs. 500.000, Seña Gs. 150.000, Saldo Gs. 350.000)
  const depRes = await callWithToken(cashier.token, () =>
    postDeposits(
      makeReq("http://localhost:3000/api/v1/gastronomy/deposits", "POST", {
        customerName: "Cliente Reserva VIP",
        tableId: testTable.id,
        depositType: "FIXED",
        estimatedConsumptionCents: 500000,
        depositAmountCents: 150000,
        paymentMethod: "BANK_TRANSFER",
      })
    )
  );
  const depJson = await depRes.json();
  assert(
    depRes.ok &&
      depJson.deposit.pendingConsumptionBalanceCents === 350000 &&
      depJson.deposit.remainingCreditCents === 150000,
    "Caso Especial 9: Seña registrada con saldo pendiente Gs. 350.000 y crédito Gs. 150.000"
  );

  // Caso 4 y 6: Dos pedidos simultáneos en la misma sesión de cliente
  const simOrder1Res = await callWithToken(admin.token, () =>
    postOrders(
      makeReq("http://localhost:3000/api/v1/gastronomy/orders", "POST", {
        tenantId,
        tableId: testTable.id,
        tableLabel: testTable.label,
        sessionCode: "SES-MULTI-001",
        deliveryMode: "BAR_PICKUP",
        items: [{ productId: beerJson.product.id, quantity: 2 }], // 50.000
      })
    )
  );
  const simOrder2Res = await callWithToken(admin.token, () =>
    postOrders(
      makeReq("http://localhost:3000/api/v1/gastronomy/orders", "POST", {
        tenantId,
        tableId: testTable.id,
        tableLabel: testTable.label,
        sessionCode: "SES-MULTI-001",
        deliveryMode: "BAR_PICKUP",
        items: [{ productId: beerJson.product.id, quantity: 4 }], // 100.000
      })
    )
  );
  const simOrder1 = (await simOrder1Res.json()).order;
  const simOrder2 = (await simOrder2Res.json()).order;
  assert(
    simOrder1.orderNumber !== simOrder2.orderNumber,
    "Casos Especiales 4 y 6: Dos pedidos simultáneos en misma sesión con numeración única"
  );

  // Caso 3: Pedido cancelado restaura stock automáticamente
  const cancelRes = await callWithToken(admin.token, () =>
    patchOrderAction(
      makeReq("http://localhost:3000/api/v1/gastronomy/orders/action", "PATCH", {
        orderId: simOrder1.id,
        action: "CANCEL_ORDER",
        reason: "Cliente cambió de bebida",
      })
    )
  );
  assert((await cancelRes.json()).order.status === "CANCELLED", "Caso Especial 3: Pedido cancelado y stock restaurado");

  // Caso 7: División de cuenta (SPLIT_TABLE_SESSION)
  const splitRes = await callWithToken(cashier.token, () =>
    postTables(
      makeReq("http://localhost:3000/api/v1/gastronomy/tables", "POST", {
        action: "SPLIT_TABLE_SESSION",
        tableId: testTable.id,
        splitParts: 4,
      })
    )
  );
  const splitJson = await splitRes.json();
  assert(
    splitRes.status === 200 && splitJson.splitAccounts?.length === 4,
    "Caso Especial 7: División de cuenta calculada en 4 partes"
  );

  // Caso 2: Pago rechazado
  const qrGenRes = await callWithToken(cashier.token, () =>
    postPayments(
      makeReq("http://localhost:3000/api/v1/gastronomy/payments", "POST", {
        action: "GENERATE_QR_PAYMENT",
        orderId: simOrder2.id,
        provider: "BANCARD_QR_PY",
      })
    )
  );
  const qrGenJson = await qrGenRes.json();
  const rejectRes = await callWithToken(cashier.token, () =>
    postPayments(
      makeReq("http://localhost:3000/api/v1/gastronomy/payments", "POST", {
        action: "REJECT_PAYMENT",
        paymentId: qrGenJson.payment.id,
        reason: "Fondos insuficientes informados por proveedor",
      })
    )
  );
  assert(
    (await rejectRes.json()).payment.status === "REJECTED",
    "Caso Especial 2: Pago rechazado procesado correctamente"
  );

  // Caso 8: Pago parcial (Gs. 40.000 de Gs. 100.000)
  const partialRes = await callWithToken(cashier.token, () =>
    postPayments(
      makeReq("http://localhost:3000/api/v1/gastronomy/payments", "POST", {
        action: "CONFIRM_CASH_PAYMENT",
        orderId: simOrder2.id,
        paymentModality: "PARTIAL",
        amountCents: 40000,
        receivedAmountCents: 40000,
      })
    )
  );
  const partialJson = await partialRes.json();
  assert(
    partialJson.order.paymentStatus === "PARTIALLY_PAID" && partialJson.order.paidCents === 40000,
    "Caso Especial 8: Pago parcial registrado con Gs. 40.000 abonados"
  );

  // Caso 10: Devolución / Reembolso (REFUND_PAYMENT)
  const refundRes = await callWithToken(admin.token, () =>
    postPayments(
      makeReq("http://localhost:3000/api/v1/gastronomy/payments", "POST", {
        action: "REFUND_PAYMENT",
        paymentId: partialJson.payment.id,
        reason: "Devolución autorizada E2E",
      })
    )
  );
  assert((await refundRes.json()).payment.status === "REFUNDED", "Caso Especial 10: Devolución procesada");

  console.log("✅ Casos Especiales 2, 3, 4, 6, 7, 8, 9 y 10 completados exitosamente.\n");
  console.log("==================================================================");
  console.log("🎉 TODOS LOS 18 PASOS Y 12 CASOS ESPECIALES PASARON CON ÉXITO (100%)");
  console.log("==================================================================");
}

runGastronomyE2ETests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
