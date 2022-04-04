/*
|--------------------------------------------------------------------------
| Routes
|--------------------------------------------------------------------------
|
| This file is dedicated for defining HTTP routes. A single file is enough
| for majority of projects, however you can define routes in different
| files and just make sure to import them inside this file. For example
|
| Define routes in following two files
| ├── start/routes/cart.ts
| ├── start/routes/customer.ts
|
| and then import them inside `start/routes.ts` as follows
|
| import './routes/cart'
| import './routes/customer'
|
*/

import Route from '@ioc:Adonis/Core/Route'
import PdfSigner from './PdfSigner';
import { readFile, writeFile, stat, readdir, mkdir, rm } from 'fs/promises';
import AdmZip from 'adm-zip'
import Env from '@ioc:Adonis/Core/Env'
import signatures_map from "./signatures_map"

const filesPath: string = Env.get('FILES_PATH')

Route.get('/', async () => {
  return 'iSigner - '+Env.get('APP_VERSION')
})

Route.post('pdf', async ({ request }) => {

  const file = request.file('file')
  const {assinatura:signId} = request.headers()

  if (file) {
    await file.move(filesPath)

    const filePath = filesPath+'/'+file.clientName

    const pdfDataBuffer = await readFile(filePath)

    const pdfSignerInstance = new PdfSigner();
  
    const signedPdf = await pdfSignerInstance.signDocument(pdfDataBuffer,signId)

    await writeFile(filePath,signedPdf)
  
  }
  return { result : 'iSigner: Arquivo recebido e assinado'}
})

Route.post('zip', async ({ request }) => {

  const file = request.file('file')
  const {assinatura:signId} = request.headers()

  if (file) {
    await file.move(filesPath)  

    const zipFile = filesPath+'/'+file.clientName

    const zipFiles = zipFile.slice(0,-4)

    const zip = new AdmZip(zipFile)

    zip.extractAllTo(zipFiles, true);

    await mkdir(zipFiles+'.p7s', { recursive: true })

    const files = await readdir(zipFiles)

    var chilkat = require('@chilkat/ck-node16-linux64')

    var crypt = new chilkat.Crypt2();

    const sign = signatures_map[Number(signId)]

    // Use a digital certificate and private key from a PFX file (.pfx or .p12).
    var signingCertSubject = sign.subject;
    var pfxFilename = __dirname+'/signatures/'+sign.signFile;
    var pfxPassword = sign.password;

    var certStore = new chilkat.CertStore();
    var success = await certStore.LoadPfxFile(pfxFilename,pfxPassword);
    if (success !== true) {
        return { result : certStore.LastErrorText}
    }

    // cert: Cert
    var cert = await certStore.FindCertBySubject(signingCertSubject);
    if (certStore.LastMethodSuccess == false) {
      return { result : "Failed to find certificate by subject common name."}
    }

    // Tell the crypt component to use this cert.
    success = await crypt.SetSigningCert(cert);

    await Promise.all(files.map(async f =>{

      // We can sign any type of file, creating a .p7s as output:
      var inFile = zipFiles+'/'+f;
      var sigFile = zipFiles+'.p7s'+'/'+f+'.p7s';

      success = await crypt.CreateP7S(inFile,sigFile);
      if (success == false) {
        return { result : certStore.LastErrorText}
      }

      return null

    }))

    const zipOut = new AdmZip()

    zipOut.addLocalFolder(zipFiles+'.p7s')

    zipOut.writeZip(zipFiles+'.p7s.zip')

    // Arquivo zip
    rm(zipFile)
    // Apaga o diretorio com os arquivos origem
    rm(zipFiles,{recursive: true})
    // Apaga o diretorio com os arquivos assinaturaorigem
    rm(zipFiles+'.p7s',{recursive: true})

  } else {
    return { result : 'iSigner: Arquivo não recebido'}
  }
  return { result : 'iSigner: Arquivos recebidos e assinados'}
})


Route.get('pdf', async ({request, response}) => {

  const fileName = request.headers().file_name

  const filePath = filesPath+'/'+fileName
  
  try {
    const stats = await stat(filePath)
    if (stats.isFile()) {
      response.response.on('unpipe',(e:any)=>rm(e.path))
      return response.download(filePath)
    }
  } catch(err) {
    return 'iSigner: '+err.message;
  }
})

Route.get('zip', async ({ request,response }) => {

  const fileName = request.headers().file_name

  const filePath = filesPath+'/'+fileName
  
  try {
    const stats = await stat(filePath)
    if (stats.isFile()) {
        response.response.on('unpipe',(e:any)=>rm(e.path))
        return response.download(filePath);
    }
  } catch(err) {
    return 'iSigner: '+err.message;
  }
})