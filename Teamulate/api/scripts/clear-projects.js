// api/scripts/clear-projects.js
import prisma from '../src/lib/prisma.js';

async function main() {
  await prisma.activity.deleteMany({});
  await prisma.file.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.projectMember.deleteMany({});
  await prisma.project.deleteMany({});
  console.log('cleared projects');
}

main().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1)});
