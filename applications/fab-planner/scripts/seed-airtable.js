// Script to seed 5 prosthesis parts into Airtable
const Airtable = require('airtable');
require('dotenv').config();

const base = new Airtable({
    apiKey: process.env.AIRTABLE_API_KEY
}).base(process.env.AIRTABLE_BASE_ID);

const parts = [
    {
        "Part Name": "Femoral Stem - Ti6Al4V",
        "Order ID": "ORD-2026-001",
        "Status": "In progress",
        "Material": "Ti-6Al-4V Titanium",
        "Notes": "Custom hip replacement stem. Patient: M.L. Left side. Standard taper.",
        "Due Date": "2026-03-01"
    },
    {
        "Part Name": "Acetabular Cup - CoCr",
        "Order ID": "ORD-2026-002",
        "Status": "Todo",
        "Material": "CoCr Alloy (ASTM F75)",
        "Notes": "Press-fit design, 52mm OD. Porous coating on outer surface.",
        "Due Date": "2026-03-05"
    },
    {
        "Part Name": "Tibial Baseplate - PEEK",
        "Order ID": "ORD-2026-003",
        "Status": "Todo",
        "Material": "PEEK-OPTIMA",
        "Notes": "Knee replacement baseplate. Radiolucent design, 4 peg fixation.",
        "Due Date": "2026-03-10"
    },
    {
        "Part Name": "Dental Abutment - Zirconia",
        "Order ID": "ORD-2026-004",
        "Status": "Done",
        "Material": "Yttria-stabilized Zirconia",
        "Notes": "Custom dental implant abutment. Shade A2. Internal hex connection.",
        "Due Date": "2026-02-20"
    },
    {
        "Part Name": "Spinal Cage - 316L SS",
        "Order ID": "ORD-2026-005",
        "Status": "In progress",
        "Material": "316L Stainless Steel",
        "Notes": "Anterior lumbar interbody fusion cage. Lattice structure for bone ingrowth.",
        "Due Date": "2026-03-15"
    }
];

async function seed() {
    try {
        const records = await base('Parts').create(
            parts.map(fields => ({ fields })),
            { typecast: true }
        );
        console.log(`✅ Created ${records.length} parts:`);
        records.forEach(r => {
            console.log(`  - ${r.fields['Part Name']} (${r.id})`);
        });
    } catch (err) {
        console.error('❌ Error:', err.message);
    }
}

seed();
