import { EmiApplication } from '../../types/emiApplication';
import { FiCase } from '../../types/fiCase';
import { getAllFiCases } from '../../services/emiService';

export async function findFiCaseForApplication(application: EmiApplication): Promise<FiCase | undefined> {
  const fiCases = await getAllFiCases();
  return findFiCaseForApplicationSync(application, fiCases);
}

export function findFiCaseForApplicationSync(
  application: EmiApplication,
  fiCases: FiCase[],
): FiCase | undefined {
  // Prefer an explicit backend link (fi_cases.applicationId)
  if (application.id) {
    const linked = fiCases.find((fiCase) => fiCase.applicationId === application.id);
    if (linked) return linked;
  }
  return fiCases.find(
    (fiCase) =>
      fiCase.customerName === application.customerName && fiCase.mobile === application.mobile,
  );
}
