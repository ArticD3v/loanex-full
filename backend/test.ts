import { orderRepository } from './src/modules/order/repository/order.repository';

async function run() {
  try {
    const res = await orderRepository.listForUser('00000000-0000-4000-8000-000000000000');
    console.log('LENGTH:', res.length);
    console.log(JSON.stringify(res, null, 2));
  } catch (err) {
    console.error('ERROR', err);
  }
}

run();
