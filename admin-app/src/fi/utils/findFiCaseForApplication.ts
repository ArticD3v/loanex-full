import { EmiApplication } from '../../types/emiApplication';
import { FiCase } from '../../types/fiCase';
import { getAllFiCases } from '../../services/emiService';

export async function findFiCaseForApplication(application: EmiApplication): Promise<FiCase | undefined> {
  const fiCases = await getAllFiCases();
  return fiCases.find(
    (fiCase) =>
      fiCase.customerName === application.customerName && fiCase.mobile === application.mobile,
  );
}

export function findFiCaseForApplicationSync(
  application: EmiApplication,
  fiCases: FiCase[],
): FiCase | undefined {
  return fiCases.find(
    (fiCase) =>
      fiCase.customerName === application.customerName && fiCase.mobile === application.mobile,
  );
}
