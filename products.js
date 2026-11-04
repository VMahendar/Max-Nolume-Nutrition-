/* Single source of truth for the public catalogue. All prices are retail (INR).
Manufacturer source for Nitro Mass is linked, not copied or treated as a verified lab report.
Never publish the wholesale tier here. */
const P=[
 {id:"whey-chocolate",name:"Potency Whey",cat:"whey",size:"5 lbs",variants:[{label:"Chocolate · 5 lbs",price:4999}],desc:"Whey protein for daily training and recovery.",img:"https://unicornproseries.com/wp-content/uploads/2026/05/Potency-Whey-600x501-1.png",imageNote:"Manufacturer reference image; confirm current flavour label"},
 {id:"whey-coffee",name:"Potency Whey",cat:"whey",size:"5 lbs",variants:[{label:"Coffee · 5 lbs",price:4999}],desc:"Whey protein for daily training and recovery.",img:"https://unicornproseries.com/wp-content/uploads/2026/05/Potency-Whey-600x501-1.png",imageNote:"Manufacturer reference image; confirm current flavour label"},
 {id:"sturdy-watermelon",name:"Sturdy Pre-Workout",cat:"pre",size:"250 g",variants:[{label:"Watermelon · 250 g",price:1399}],desc:"Pre-workout supplement in the Watermelon flavour.",img:"https://static.wixstatic.com/media/1ff000_c2a176e091a14c6a9c0bf121a2007f5c~mv2.png",imageNote:"Manufacturer reference; verify current label"},
 {officialUrl:"https://unicornproseries.com/product/nitro-mass/",id:"nitro-mass-5kg",name:"Nitro Mass",cat:"mass",size:"5 kg bucket",variants:[{label:"5 kg · Bucket",price:3499}],desc:"Mass gainer in the 5 kg bucket pack.",img:"https://static.wixstatic.com/media/1ff000_f0a98421d4c647d18591722f454076cf~mv2.png",imageNote:"5 kg bucket packaging photo"},
 {officialUrl:"https://unicornproseries.com/product/nitro-mass/",id:"nitro-mass-3kg",name:"Nitro Mass",cat:"mass",size:"3 kg box",variants:[{label:"3 kg · Box",price:2599}],desc:"Mass gainer in the 3 kg box pack.",img:"",imageNote:"3 kg box photo pending verification"},
 {id:"creatine-blueberry",name:"Pro Creatine",cat:"creatine",size:"100 g",variants:[{label:"Blueberry · 100 g",price:899}],desc:"Creatine supplement, Blueberry flavour.",img:"https://static.wixstatic.com/media/1ff000_8db16ef46b194a72b5a5657b83130626~mv2.png",imageNote:"Manufacturer reference; confirm flavour packaging"},
 {id:"creatine-cranberry",name:"Pro Creatine",cat:"creatine",size:"100 g",variants:[{label:"Cranberry · 100 g",price:899}],desc:"Creatine supplement, Cranberry flavour.",img:"https://static.wixstatic.com/media/1ff000_8db16ef46b194a72b5a5657b83130626~mv2.png",imageNote:"Manufacturer reference; confirm flavour packaging"},
 {id:"musclevite",name:"Musclevite Multivitamin",cat:"vitamins",size:"1 pack",variants:[{label:"1 pack",price:699}],desc:"Daily multivitamin supplement.",img:"",imageNote:"Pack photo pending verification"}
];
const MVN_PRODUCT_SOURCE="supplier-invoice-2026-10-29";
