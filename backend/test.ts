import { orderRepository } from './src/modules/order/repository/order.repository';

async function run() {
  try {
    const res = await orderRepository.listForUser('d8f57913-2d25-4a65-8b36-4c28f645a271');
    console.log('LENGTH:', res.length);
    console.log(JSON.stringify(res, null, 2));
  } catch (err) {
    console.error('ERROR', err);
  }
}

run();
