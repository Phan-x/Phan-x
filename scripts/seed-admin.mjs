import "dotenv/config";
import crypto from "node:crypto";
import postgres from "postgres";
const email=(process.env.ADMIN_EMAIL||"").trim().toLowerCase();
const username=(process.env.ADMIN_USERNAME||"admin").trim();
const name=(process.env.ADMIN_NAME||"CwaAX Admin").trim();
const password=process.env.ADMIN_PASSWORD||"";
if(!email||!password) throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD before running db:seed-admin");
const salt=crypto.randomBytes(16).toString("hex");
const derived=crypto.scryptSync(password,salt,64,{N:16384,r:8,p:1}).toString("hex");
const passwordHash=`scrypt$16384$8$1$${salt}$${derived}`;
const sql=postgres(process.env.DATABASE_URL,{prepare:false});
const rows=await sql`SELECT id FROM users WHERE email=${email} LIMIT 1`;
if(rows.length){await sql`UPDATE users SET name=${name}, username=${username}, "passwordHash"=${passwordHash}, role='admin', "loginMethod"='email' WHERE email=${email}`;}
else {const openId=`local_${crypto.randomUUID()}`; await sql`INSERT INTO users ("openId",name,username,email,"passwordHash","loginMethod",role) VALUES (${openId},${name},${username},${email},${passwordHash},'email','admin')`;}
await sql.end(); console.log(`Admin account ready: ${email}`);
