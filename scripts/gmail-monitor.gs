/**
 * Back to School Bash — Amazon Wish List Gmail Monitor
 * =====================================================
 * Paste this entire file into the Google Apps Script editor
 * (Extensions → Apps Script) for the Back to School Bash spreadsheet.
 *
 * SETUP STEPS:
 *   1. Paste this code into Apps Script
 *   2. Run setupSuppliesTab() once to initialize the sheet
 *   3. Wait until Freddie has forwarded an Amazon purchase email to zachgreenlief@gmail.com
 *   4. Run testParseEmails() to verify parsing works correctly
 *   5. When ready to go live, run installTrigger()
 *
 * HOW IT WORKS:
 *   - Freddie auto-forwards Amazon "registry item purchased" emails to zachgreenlief@gmail.com
 *   - This script runs every 10 minutes, searches Gmail for those emails
 *   - Parses item names and quantities, updates the "supplies" tab in this sheet
 *   - The website reads the sheet live — no redeployment needed
 */

// ── Item name mapping ─────────────────────────────────────────────────────────
// Maps fragments found in Amazon email product names → internal site item names.
// Amazon email names are often truncated or slightly different from product pages.
// Add/edit entries here if parsing misses an item.
const ITEM_MAP = [
  // Backpacks
  { keywords: ['mibasies', 'girls', 'backpack'],            name: 'Backpacks — Girls (ages 5–8)'       },
  { keywords: ['mibasies', 'boys', 'backpack'],             name: 'Backpacks — Boys (ages 5–8)'        },
  { keywords: ['trailmaker', 'backpack'],                   name: 'Backpacks — Classic 17″'            },
  { keywords: ['trailmaker', '17'],                         name: 'Backpacks — Classic 17″'            },
  { keywords: ['rickyh', 'backpack'],                       name: 'Backpacks — Various Styles'         },
  // Notebooks / paper
  { keywords: ['oxford', 'spiral', 'notebook'],             name: 'Composition Notebooks'              },
  { keywords: ['oxford', 'notebook'],                       name: 'Composition Notebooks'              },
  { keywords: ['rosmonde', 'loose', 'leaf'],                name: 'Loose-Leaf Paper (College Ruled)'   },
  { keywords: ['top flight', 'filler'],                     name: 'Loose-Leaf Paper (Filler)'          },
  { keywords: ['filler paper'],                             name: 'Loose-Leaf Paper (Filler)'          },
  // Pencils
  { keywords: ['bic', 'mechanical', 'pencil'],              name: 'Pencils & Pens (Mechanical)'        },
  { keywords: ['bic', 'xtra'],                              name: 'Pencils & Pens (Mechanical)'        },
  { keywords: ['amazon basics', 'wood', 'pencil'],          name: 'Pencils & Pens (Wood-Cased)'        },
  { keywords: ['wood-cased', 'pencil'],                     name: 'Pencils & Pens (Wood-Cased)'        },
  // Crayons / colored pencils
  { keywords: ['crayola', 'colored pencil'],                name: 'Crayons & Colored Pencils (36ct)'   },
  { keywords: ['crayola', '36'],                            name: 'Crayons & Colored Pencils (36ct)'   },
  { keywords: ['crayola', 'crayon'],                        name: 'Crayons & Colored Pencils (Crayons)'},
  { keywords: ['crayola', '24'],                            name: 'Crayons & Colored Pencils (Crayons)'},
  // Highlighters
  { keywords: ['v-opitos', 'highlight'],                    name: 'Highlighters'                       },
  { keywords: ['highlight'],                                name: 'Highlighters'                       },
  // Glue sticks
  { keywords: ["elmer's", 'glue'],                          name: 'Glue Sticks'                        },
  { keywords: ['elmer', 'glue'],                            name: 'Glue Sticks'                        },
  { keywords: ['glue stick'],                               name: 'Glue Sticks'                        },
  // Scissors
  { keywords: ['burvagy', 'scissor'],                       name: "Kids' Scissors"                     },
  { keywords: ['safety scissor'],                           name: "Kids' Scissors"                     },
  { keywords: ['kid', 'scissor'],                           name: "Kids' Scissors"                     },
  // Folders / binders
  { keywords: ['amazon basics', 'folder'],                  name: 'Folders & Binders (Pocket Folders)' },
  { keywords: ['heavy duty', 'folder'],                     name: 'Folders & Binders (Pocket Folders)' },
  { keywords: ['sunee', 'binder'],                          name: 'Folders & Binders (3-Ring Binders)' },
  { keywords: ['3 ring', 'binder'],                         name: 'Folders & Binders (3-Ring Binders)' },
  { keywords: ['3-ring', 'binder'],                         name: 'Folders & Binders (3-Ring Binders)' },
  // Pencil pouches
  { keywords: ['yegeer', 'pencil', 'pouch'],                name: 'Pencil Pouches / Cases'             },
  { keywords: ['pencil pouch'],                             name: 'Pencil Pouches / Cases'             },
  { keywords: ['pencil case'],                              name: 'Pencil Pouches / Cases'             },
];

// All item names tracked in the supplies tab (must match about.component.ts exactly)
const ALL_SUPPLY_ITEMS = [
  'Backpacks — Girls (ages 5–8)',
  'Backpacks — Boys (ages 5–8)',
  'Backpacks — Classic 17″',
  'Backpacks — Various Styles',
  'Composition Notebooks',
  'Pencils & Pens (Wood-Cased)',
  'Pencils & Pens (Mechanical)',
  'Crayons & Colored Pencils (36ct)',
  'Crayons & Colored Pencils (Crayons)',
  'Highlighters',
  'Glue Sticks',
  "Kids' Scissors",
  'Rulers & Geometry Sets',
  'Folders & Binders (Pocket Folders)',
  'Folders & Binders (3-Ring Binders)',
  'Pencil Pouches / Cases',
  'Erasers',
  'Loose-Leaf Paper (College Ruled)',
  'Loose-Leaf Paper (Filler)',
  'Gift Cards',
];

// Gmail label applied to processed emails so they aren't counted twice
const PROCESSED_LABEL = 'amazon-registry-processed';

// ── Main function (called by timer trigger) ───────────────────────────────────
function checkAmazonEmails() {
  const sheet = getOrCreateSuppliesSheet();
  const label = getOrCreateLabel(PROCESSED_LABEL);

  // Search for forwarded Amazon registry purchase emails not yet processed
  const query = 'subject:("registry" OR "wish list" OR "gift list") from:(amazon) -label:' + PROCESSED_LABEL;
  const threads = GmailApp.search(query, 0, 50);

  if (threads.length === 0) {
    Logger.log('No new Amazon registry emails found.');
    return;
  }

  Logger.log('Found ' + threads.length + ' thread(s) to process.');

  for (const thread of threads) {
    for (const message of thread.getMessages()) {
      const subject = message.getSubject();
      const body    = message.getPlainBody() + ' ' + message.getBody();

      Logger.log('Processing: ' + subject);

      const purchases = parseEmailForPurchases(subject, body);
      if (purchases.length === 0) {
        Logger.log('  → No purchases found in this email (may not be a registry purchase notification)');
        continue;
      }

      for (const { name, qty } of purchases) {
        incrementSupplyCount(sheet, name, qty);
        Logger.log('  → Updated "' + name + '" +' + qty);
      }
    }

    // Mark thread as processed so it won't be counted again
    thread.addLabel(label);
  }

  Logger.log('Done. Supplies tab updated.');
}

// ── Email parser ──────────────────────────────────────────────────────────────
function parseEmailForPurchases(subject, body) {
  const results = [];
  const combined = (subject + ' ' + body).toLowerCase();

  // Only process registry/wish list purchase notifications
  const isPurchaseNotification =
    combined.includes('purchased') ||
    combined.includes('registry') ||
    combined.includes('wish list') ||
    combined.includes('gift list');

  if (!isPurchaseNotification) return results;

  // Try to extract quantity from patterns like "Qty: 2", "Quantity: 2", "x2", "(2)"
  // Default to 1 if no quantity found
  const qtyMatch = body.match(/qty[:\s]+(\d+)|quantity[:\s]+(\d+)|\bx(\d+)\b|\((\d+)\)/i);
  const qty = qtyMatch
    ? parseInt(qtyMatch[1] || qtyMatch[2] || qtyMatch[3] || qtyMatch[4])
    : 1;

  // Match product name from ITEM_MAP
  for (const entry of ITEM_MAP) {
    const allMatch = entry.keywords.every(kw => combined.includes(kw.toLowerCase()));
    if (allMatch) {
      // Avoid duplicate entries for the same item name
      if (!results.find(r => r.name === entry.name)) {
        results.push({ name: entry.name, qty });
      }
    }
  }

  return results;
}

// ── Sheet helpers ─────────────────────────────────────────────────────────────
function getOrCreateSuppliesSheet() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  let   sheet = ss.getSheetByName('supplies');

  if (!sheet) {
    sheet = ss.insertSheet('supplies');
    Logger.log('Created "supplies" tab.');
  }

  // Ensure header row exists
  if (sheet.getLastRow() === 0 || sheet.getRange(1, 1).getValue() !== 'name') {
    sheet.clearContents();
    sheet.getRange(1, 1, 1, 2).setValues([['name', 'have']]);
    sheet.getRange(1, 1, 1, 2).setFontWeight('bold');

    // Pre-populate all items at 0
    const rows = ALL_SUPPLY_ITEMS.map(name => [name, 0]);
    sheet.getRange(2, 1, rows.length, 2).setValues(rows);
    Logger.log('Initialized supplies tab with ' + rows.length + ' items.');
  }

  return sheet;
}

function incrementSupplyCount(sheet, itemName, qty) {
  const data      = sheet.getDataRange().getValues();
  const headerRow = 1; // row 1 is the header

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === itemName) {
      const current = Number(data[i][1]) || 0;
      sheet.getRange(i + 1, 2).setValue(current + qty);
      return;
    }
  }

  // Item not found — add a new row
  Logger.log('  → Item not in supplies tab, adding: ' + itemName);
  sheet.appendRow([itemName, qty]);
}

function getOrCreateLabel(name) {
  const existing = GmailApp.getUserLabels().find(l => l.getName() === name);
  return existing || GmailApp.createLabel(name);
}

// ── Setup & trigger management ────────────────────────────────────────────────

/**
 * Run this ONCE to initialize the supplies tab with all item names at 0.
 * Safe to run multiple times — won't overwrite existing data if tab already exists.
 */
function setupSuppliesTab() {
  const sheet = getOrCreateSuppliesSheet();
  Logger.log('Supplies tab is ready. Row count: ' + (sheet.getLastRow() - 1) + ' items.');
  SpreadsheetApp.getUi().alert('✅ Supplies tab initialized! Check the "supplies" sheet tab.');
}

/**
 * Run this to test parsing WITHOUT modifying the sheet.
 * Searches Gmail for Amazon registry emails and logs what would be updated.
 */
function testParseEmails() {
  const query   = 'subject:("registry" OR "wish list" OR "gift list") from:(amazon) -label:' + PROCESSED_LABEL;
  const threads = GmailApp.search(query, 0, 10);

  if (threads.length === 0) {
    Logger.log('No Amazon registry emails found. Make sure Freddie has forwarded at least one.');
    SpreadsheetApp.getUi().alert('No emails found yet. Ask Freddie to forward a purchase notification to zachgreenlief@gmail.com.');
    return;
  }

  Logger.log('Found ' + threads.length + ' thread(s):');
  for (const thread of threads) {
    for (const message of thread.getMessages()) {
      const subject   = message.getSubject();
      const body      = message.getPlainBody() + ' ' + message.getBody();
      const purchases = parseEmailForPurchases(subject, body);
      Logger.log('Subject: ' + subject);
      Logger.log('Parsed: ' + JSON.stringify(purchases));
    }
  }

  SpreadsheetApp.getUi().alert('Check the Apps Script logs (View → Logs) to see parsed results.');
}

/**
 * Installs a time-based trigger to run checkAmazonEmails() every 10 minutes.
 * ONLY call this when you are ready to go live.
 */
function installTrigger() {
  // Remove any existing trigger for this function to avoid duplicates
  removeTrigger();

  ScriptApp.newTrigger('checkAmazonEmails')
    .timeBased()
    .everyMinutes(10)
    .create();

  Logger.log('Trigger installed — checkAmazonEmails() will run every 10 minutes.');
  SpreadsheetApp.getUi().alert('✅ Trigger installed! The script will now check for new purchases every 10 minutes.');
}

/**
 * Removes the trigger. Call this to pause the automation.
 */
function removeTrigger() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'checkAmazonEmails')
    .forEach(t => ScriptApp.deleteTrigger(t));
  Logger.log('Trigger removed.');
}

/**
 * Manually set a supply count (useful for corrections or seeding initial data).
 * Edit the values below and run this function from the Apps Script editor.
 */
function manualUpdate() {
  const sheet = getOrCreateSuppliesSheet();
  const updates = [
    // { name: 'Composition Notebooks', have: 5 },
    // { name: 'Glue Sticks',           have: 5 },
    // Add lines here as needed
  ];

  for (const { name, have } of updates) {
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === name) {
        sheet.getRange(i + 1, 2).setValue(have);
        Logger.log('Set "' + name + '" → ' + have);
      }
    }
  }

  Logger.log('Manual update complete.');
}
