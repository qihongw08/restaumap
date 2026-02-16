import { Suspense } from 'react';
import { ImportContent } from '@/app/import/import-content';
import { Loading } from '@/components/shared/loading';

export default function ImportPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ImportContent />
    </Suspense>
  );
}
