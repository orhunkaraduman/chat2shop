import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { firebaseEnabled, firebaseStorage } from '@/config/firebase';

const maxSellerImageBytes = 8 * 1024 * 1024;
type SellerBrandImageKind = 'logo' | 'cover';

export async function uploadSellerImage(uri: string, userId: string) {
  if (!firebaseEnabled || !firebaseStorage || uri.startsWith('http')) {
    return uri;
  }

  const blob = await getValidatedImageBlob(uri, 'Görsel');

  const extension = normalizeImageExtension(blob.type);
  const path = `sellerUploads/${userId}/${Date.now()}.${extension}`;
  const uploadRef = ref(firebaseStorage, path);
  await uploadBytes(uploadRef, blob, {
    contentType: blob.type,
    customMetadata: {
      ownerId: userId,
      source: 'seller-product-upload',
    },
  });
  return getDownloadURL(uploadRef);
}

export async function uploadSellerBrandImage(uri: string, userId: string, kind: SellerBrandImageKind) {
  if (!firebaseEnabled || !firebaseStorage || uri.startsWith('http')) {
    return uri;
  }

  const blob = await getValidatedImageBlob(uri, kind === 'logo' ? 'Logo görseli' : 'Cover görseli');
  const extension = normalizeImageExtension(blob.type);
  const path = `sellerUploads/${userId}/store-${kind}-${Date.now()}.${extension}`;
  const uploadRef = ref(firebaseStorage, path);

  await uploadBytes(uploadRef, blob, {
    contentType: blob.type,
    customMetadata: {
      ownerId: userId,
      source: `seller-store-${kind}`,
    },
  });

  return getDownloadURL(uploadRef);
}

export async function uploadTryOnInputImage(uri: string, userId: string) {
  if (!firebaseEnabled || !firebaseStorage || uri.startsWith('http')) {
    return {
      downloadUrl: uri,
      storagePath: undefined,
    };
  }

  const blob = await getValidatedImageBlob(uri, 'Kabin fotoğrafı');

  const extension = normalizeImageExtension(blob.type);
  const path = `tryOnInputs/${userId}/${Date.now()}/model.${extension}`;
  const uploadRef = ref(firebaseStorage, path);
  await uploadBytes(uploadRef, blob, {
    contentType: blob.type,
    customMetadata: {
      ownerId: userId,
      source: 'try-on-input',
    },
  });

  return {
    downloadUrl: await getDownloadURL(uploadRef),
    storagePath: path,
  };
}

async function getValidatedImageBlob(uri: string, label: string) {
  const response = await fetch(uri);
  const blob = await response.blob();

  if (!blob.type.startsWith('image/')) {
    throw new Error(`${label} için sadece görsel dosyaları yüklenebilir.`);
  }
  if (blob.size > maxSellerImageBytes) {
    throw new Error(`${label} 8MB sınırını aşamaz.`);
  }

  return blob;
}

function normalizeImageExtension(contentType: string) {
  const extension = contentType.split('/')[1]?.toLowerCase() || 'jpg';
  if (extension === 'jpeg') return 'jpg';
  if (extension === 'svg+xml') return 'svg';
  return extension.replace(/[^a-z0-9]/g, '') || 'jpg';
}
