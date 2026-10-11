// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { axe } from 'jest-axe';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import AddVehiclePage from './AddVehiclePage';
import * as stickerFile from '../lib/stickerFile';

const BASE = 'http://192.168.8.11:8080/api/v1';

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AddVehiclePage />
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

const next = (user) => user.click(screen.getByRole('button', { name: /^continue$/i }));

// The form is four steps: The car → Price & place → Features → Photos.
async function fillCar(user) {
  await user.type(screen.getByLabelText(/^model$/i), 'Toyota Prado');
  await user.type(screen.getByLabelText(/^color$/i), 'Pearl White');
  await user.type(screen.getByLabelText(/^vin$/i), 'VIN123456789');
  await user.type(screen.getByLabelText(/registration number/i), 'KDA 123A');
}
async function fillPrice(user, { seats = '5' } = {}) {
  await user.type(screen.getByLabelText(/^location$/i), 'Nairobi CBD');
  await user.type(screen.getByLabelText(/price per day/i), '15000');
  if (seats) await user.type(screen.getByLabelText(/seat capacity/i), seats);
}
async function fillFeatures(user) {
  await user.selectOptions(screen.getByLabelText(/fuel type/i), 'DIESEL');
  await user.selectOptions(screen.getByLabelText(/transmission/i), 'AUTOMATIC');
  // Comprehensive insurance and its sticker photo are mandatory.
  await user.click(screen.getByRole('checkbox', { name: /comprehensive insurance/i }));
  chooseFile(screen.getByLabelText(/add insurance sticker photo/i), new File(['x'], 'sticker.jpg', { type: 'image/jpeg' }));
}

/** Walks steps 1–3 and lands on the photos step. */
async function goToPhotos(user, options) {
  await fillCar(user);
  await next(user);
  await screen.findByLabelText(/^location$/i);
  await fillPrice(user, options);
  await next(user);
  await screen.findByLabelText(/fuel type/i);
  await fillFeatures(user);
  await next(user);
  await screen.findByText(/0 of 6 angles added/i);
}

// fireEvent rather than user.upload(): userEvent's upload() simulates a real
// click-to-open-file-dialog interaction, which is flaky when run alongside
// other tests in this file (an internal userEvent/jsdom pointer-state
// interaction, not an application bug). Setting `.files` directly and
// firing `change` exercises the same change handlers.
function chooseFile(input, file) {
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  fireEvent.change(input);
}

const stepLabels = () =>
  within(screen.getByRole('navigation', { name: /progress/i }))
    .getAllByRole('listitem')
    .map((li) => li.textContent.replace(/\d+/g, '').trim());

describe('AddVehiclePage steps', () => {
  it('shows four steps and only the first one at a time', () => {
    renderPage();
    expect(stepLabels()).toEqual(['The car', 'Price & place', 'Features', 'Photos']);
    expect(screen.getByRole('heading', { name: /about the car/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^model$/i)).toBeInTheDocument();
    // Later steps' fields are not on screen yet, and neither is the final submit.
    expect(screen.queryByLabelText(/^location$/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/fuel type/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^add vehicle$/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^continue$/i })).toBeInTheDocument();
  });

  it('will not leave a step until its required fields are filled', async () => {
    const user = userEvent.setup();
    renderPage();
    await next(user);

    expect(await screen.findByText(/enter the vehicle model/i)).toBeInTheDocument();
    expect(screen.getByText(/enter the vin/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /about the car/i })).toBeInTheDocument();
  });

  it('moves through the steps in order and keeps what was typed when going back', async () => {
    const user = userEvent.setup();
    renderPage();
    await fillCar(user);
    await next(user);

    expect(await screen.findByRole('heading', { name: /price and location/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /back/i }));

    expect(await screen.findByLabelText(/^model$/i)).toHaveValue('Toyota Prado');
    expect(screen.getByLabelText(/^vin$/i)).toHaveValue('VIN123456789');
  });

  it('requires a price and location on step two', async () => {
    const user = userEvent.setup();
    renderPage();
    await fillCar(user);
    await next(user);
    await screen.findByLabelText(/^location$/i);
    await next(user);

    expect(await screen.findByText(/enter a location/i)).toBeInTheDocument();
    expect(screen.getByText(/enter a price/i)).toBeInTheDocument();
  });

  it('requires seat capacity — the live backend rejects a vehicle without it, although the spec omits it', async () => {
    const user = userEvent.setup();
    renderPage();
    await fillCar(user);
    await next(user);
    await screen.findByLabelText(/^location$/i);
    await fillPrice(user, { seats: '' });
    await next(user);

    expect(await screen.findByText(/enter seat capacity/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /price and location/i })).toBeInTheDocument();
  });

  it('requires at least one booking mode before leaving the features step', async () => {
    const user = userEvent.setup();
    renderPage();
    await fillCar(user);
    await next(user);
    await screen.findByLabelText(/^location$/i);
    await fillPrice(user);
    await next(user);
    await screen.findByLabelText(/fuel type/i);
    await fillFeatures(user);

    // Self-Drive is on by default — turn it off so neither mode is selected.
    await user.click(screen.getByRole('button', { name: 'Self-Drive' }));
    await next(user);

    expect(await screen.findByText(/select at least one booking mode/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^features$/i })).toBeInTheDocument();
  });

  it('toggles a trip type chip on and off', async () => {
    const user = userEvent.setup();
    renderPage();
    await fillCar(user);
    await next(user);
    await screen.findByLabelText(/^location$/i);
    await fillPrice(user);
    await next(user);
    const chip = await screen.findByRole('button', { name: 'Safari' });

    expect(chip).toHaveAttribute('aria-pressed', 'false');
    await user.click(chip);
    expect(chip).toHaveAttribute('aria-pressed', 'true');
    await user.click(chip);
    expect(chip).toHaveAttribute('aria-pressed', 'false');
  });

  it('only shows the final "Add Vehicle" button on the photos step', async () => {
    const user = userEvent.setup();
    renderPage();
    await goToPhotos(user);

    expect(screen.getByRole('button', { name: /^add vehicle$/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^continue$/i })).not.toBeInTheDocument();
  });
});

describe('AddVehiclePage photos', () => {
  it('guides photo capture with a slot and a framing tip for every angle', async () => {
    const user = userEvent.setup();
    renderPage();
    await goToPhotos(user);

    for (const label of ['Front', 'Back', 'Left side', 'Right side', 'Interior — front', 'Interior — back seats']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.getByText(/the side on your left when you stand behind the car/i)).toBeInTheDocument();
  });

  it('adds and removes a photo for a specific angle, tracking progress', async () => {
    const user = userEvent.setup();
    renderPage();
    await goToPhotos(user);

    chooseFile(screen.getByLabelText(/add front photo/i), new File(['x'], 'IMG_0001.jpg', { type: 'image/jpeg' }));
    expect(await screen.findByText('IMG_0001.jpg')).toBeInTheDocument();
    expect(screen.getByText(/1 of 6 angles added/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /remove front photo/i }));
    expect(screen.queryByText('IMG_0001.jpg')).not.toBeInTheDocument();
    expect(screen.getByText(/0 of 6 angles added/i)).toBeInTheDocument();
  });

  it('adds and removes extra photos beyond the guided angles', async () => {
    const user = userEvent.setup();
    renderPage();
    await goToPhotos(user);

    chooseFile(screen.getByLabelText(/add more photos/i), new File(['x'], 'prado.jpg', { type: 'image/jpeg' }));
    expect(await screen.findByText('prado.jpg')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /remove prado.jpg/i }));
    expect(screen.queryByText('prado.jpg')).not.toBeInTheDocument();
  });

  it('keeps chosen photos when stepping back and forward', async () => {
    const user = userEvent.setup();
    renderPage();
    await goToPhotos(user);

    chooseFile(screen.getByLabelText(/add front photo/i), new File(['x'], 'IMG_0001.jpg', { type: 'image/jpeg' }));
    await screen.findByText('IMG_0001.jpg');
    await user.click(screen.getByRole('button', { name: /back/i }));
    await next(user);

    expect(await screen.findByText('IMG_0001.jpg')).toBeInTheDocument();
  });

  it('uploads each guided photo under its angle name so the angle is kept', async () => {
    const user = userEvent.setup();
    // Asserted at the axios layer: jsdom + MSW don't serialise FormData over the fake network.
    const uploaded = [];
    const realPost = api.post.bind(api);
    const post = vi.spyOn(api, 'post').mockImplementation((url, data, config) => {
      if (String(url).includes('/photos')) {
        uploaded.push(data.get('file').name);
        return Promise.resolve({ data: { id: 'p', fileName: data.get('file').name } });
      }
      return realPost(url, data, config);
    });
    renderPage();
    await goToPhotos(user);
    chooseFile(screen.getByLabelText(/add front photo/i), new File(['x'], 'IMG_0001.jpg', { type: 'image/jpeg' }));
    chooseFile(screen.getByLabelText(/add left side photo/i), new File(['x'], 'IMG_0002.PNG', { type: 'image/png' }));
    await user.click(screen.getByRole('button', { name: /^add vehicle$/i }));

    await waitFor(() => expect([...uploaded].sort()).toEqual(['front.jpg', 'left.png', 'sticker.jpg']));
    post.mockRestore();
  });

  it('names the angles whose upload failed', async () => {
    const user = userEvent.setup();
    const errorToast = vi.spyOn(toast, 'error');
    server.use(http.post(`${BASE}/vehicles/:id/photos`, () => HttpResponse.json({ message: 'boom' }, { status: 500 })));
    renderPage();
    await goToPhotos(user);
    chooseFile(screen.getByLabelText(/add back photo/i), new File(['x'], 'a.jpg', { type: 'image/jpeg' }));
    await user.click(screen.getByRole('button', { name: /^add vehicle$/i }));

    await waitFor(() => expect(errorToast).toHaveBeenCalledWith("Couldn't upload: Back."));
    errorToast.mockRestore();
  });
});

describe('AddVehiclePage submit', () => {
  it('creates the vehicle and shows a success state with a link to view it', async () => {
    const user = userEvent.setup();
    renderPage();
    await goToPhotos(user);
    await user.click(screen.getByRole('button', { name: /^add vehicle$/i }));

    expect(await screen.findByText(/toyota prado added/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view vehicle/i })).toHaveAttribute('href', '/vehicles/new-vehicle-id');
  });

  it('sends the vehicle the way the backend expects, seat capacity included', async () => {
    const user = userEvent.setup();
    let body;
    server.use(
      http.post(`${BASE}/vehicles/create-vehicle`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ id: 'new-vehicle-id', ...body });
      })
    );
    renderPage();
    await goToPhotos(user);
    await user.click(screen.getByRole('button', { name: /^add vehicle$/i }));

    await screen.findByText(/toyota prado added/i);
    expect(body).toMatchObject({ model: 'Toyota Prado', color: 'Pearl White', vin: 'VIN123456789', registrationNumber: 'KDA 123A', location: 'Nairobi CBD', pricePerDay: 15000, capacity: 5, fuelType: 'DIESEL', transmissionType: 'AUTOMATIC' });
  });

  it('is available for booking by default, and sends that with the vehicle', async () => {
    const user = userEvent.setup();
    let body;
    server.use(
      http.post(`${BASE}/vehicles/create-vehicle`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ id: 'new-vehicle-id', ...body });
      })
    );
    renderPage();
    await goToPhotos(user);
    await user.click(screen.getByRole('button', { name: /^add vehicle$/i }));

    await screen.findByText(/toyota prado added/i);
    expect(body.available).toBe(true);
  });

  it('lets the owner add a vehicle that is not available yet', async () => {
    const user = userEvent.setup();
    let body;
    server.use(
      http.post(`${BASE}/vehicles/create-vehicle`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ id: 'new-vehicle-id', ...body });
      })
    );
    renderPage();
    await fillCar(user);
    await next(user);
    await screen.findByLabelText(/^location$/i);
    await fillPrice(user);
    await next(user);
    await screen.findByLabelText(/fuel type/i);
    await fillFeatures(user);
    await user.click(screen.getByRole('checkbox', { name: /available for booking/i }));
    await next(user);
    await screen.findByText(/0 of 6 angles added/i);
    await user.click(screen.getByRole('button', { name: /^add vehicle$/i }));

    await screen.findByText(/toyota prado added/i);
    expect(body.available).toBe(false);
  });

  it('sends air conditioning, insurance and the availability window when they are set', async () => {
    const user = userEvent.setup();
    let body;
    server.use(
      http.post(`${BASE}/vehicles/create-vehicle`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ id: 'new-vehicle-id', ...body });
      })
    );
    renderPage();
    await fillCar(user);
    await next(user);
    await screen.findByLabelText(/^location$/i);
    await fillPrice(user);
    await next(user);
    await screen.findByLabelText(/fuel type/i);
    await fillFeatures(user);
    await user.click(screen.getByRole('checkbox', { name: /working air conditioning/i }));
    await user.click(screen.getByRole('radio', { name: /only on specific dates/i }));
    fireEvent.change(screen.getByLabelText(/available from/i), { target: { value: '2026-10-01T09:00' } });
    fireEvent.change(screen.getByLabelText(/available until/i), { target: { value: '2026-12-01T09:00' } });
    await next(user);
    await screen.findByText(/0 of 6 angles added/i);
    await user.click(screen.getByRole('button', { name: /^add vehicle$/i }));

    await screen.findByText(/toyota prado added/i);
    expect(body).toMatchObject({
      hasWorkingAC: true,
      comprehensiveInsurance: true,
      availableFrom: new Date('2026-10-01T09:00').toISOString(),
      availableTo: new Date('2026-12-01T09:00').toISOString(),
    });
  });

  it('will not leave the features step without comprehensive insurance', async () => {
    const user = userEvent.setup();
    renderPage();
    await fillCar(user);
    await next(user);
    await screen.findByLabelText(/^location$/i);
    await fillPrice(user);
    await next(user);
    await screen.findByLabelText(/fuel type/i);
    await user.selectOptions(screen.getByLabelText(/fuel type/i), 'DIESEL');
    await user.selectOptions(screen.getByLabelText(/transmission/i), 'AUTOMATIC');
    chooseFile(screen.getByLabelText(/add insurance sticker photo/i), new File(['x'], 'sticker.jpg', { type: 'image/jpeg' }));
    await next(user);

    expect(await screen.findByText(/every vehicle must have comprehensive insurance/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^features$/i })).toBeInTheDocument();
  });

  it('will not leave the features step without an insurance sticker photo', async () => {
    const user = userEvent.setup();
    renderPage();
    await fillCar(user);
    await next(user);
    await screen.findByLabelText(/^location$/i);
    await fillPrice(user);
    await next(user);
    await screen.findByLabelText(/fuel type/i);
    await user.selectOptions(screen.getByLabelText(/fuel type/i), 'DIESEL');
    await user.selectOptions(screen.getByLabelText(/transmission/i), 'AUTOMATIC');
    await user.click(screen.getByRole('checkbox', { name: /comprehensive insurance/i }));
    await next(user);

    expect(await screen.findByText(/upload a photo of the insurance sticker/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^features$/i })).toBeInTheDocument();

    chooseFile(screen.getByLabelText(/add insurance sticker photo/i), new File(['x'], 'sticker.jpg', { type: 'image/jpeg' }));
    expect(screen.queryByText(/upload a photo of the insurance sticker/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /remove insurance sticker photo/i }));
    expect(screen.getByLabelText(/add insurance sticker photo/i)).toBeInTheDocument();
  });

  describe('the insurance sticker picker', () => {
    async function goToSticker(user) {
      renderPage();
      await fillCar(user);
      await next(user);
      await screen.findByLabelText(/^location$/i);
      await fillPrice(user);
      await next(user);
      await screen.findByLabelText(/fuel type/i);
    }

    it('accepts a PDF as well as an image', async () => {
      await goToSticker(userEvent.setup());
      expect(screen.getByLabelText(/add insurance sticker photo/i)).toHaveAttribute('accept', 'image/*,application/pdf');
    });

    it('shows a preview of the picked sticker', async () => {
      URL.createObjectURL = vi.fn(() => 'blob:sticker');
      await goToSticker(userEvent.setup());
      chooseFile(screen.getByLabelText(/add insurance sticker photo/i), new File(['x'], 'sticker.jpg', { type: 'image/jpeg' }));
      expect(await screen.findByRole('img', { name: /insurance sticker preview/i })).toHaveAttribute('src', 'blob:sticker');
    });

    it('turns a PDF into a picture of its first page and previews that', async () => {
      URL.createObjectURL = vi.fn(() => 'blob:page-1');
      const spy = vi.spyOn(stickerFile, 'stickerImageFrom').mockResolvedValue(new File(['png'], 'insurance.png', { type: 'image/png' }));
      await goToSticker(userEvent.setup());
      chooseFile(screen.getByLabelText(/add insurance sticker photo/i), new File(['%PDF'], 'insurance.pdf', { type: 'application/pdf' }));
      expect(await screen.findByRole('img', { name: /insurance sticker preview/i })).toHaveAttribute('src', 'blob:page-1');
      expect(screen.getByText('insurance.png')).toBeInTheDocument();
      spy.mockRestore();
    });

    it('says so when a PDF can not be read, and keeps no sticker', async () => {
      const spy = vi.spyOn(stickerFile, 'stickerImageFrom').mockRejectedValue(new Error('bad pdf'));
      await goToSticker(userEvent.setup());
      chooseFile(screen.getByLabelText(/add insurance sticker photo/i), new File(['nope'], 'broken.pdf', { type: 'application/pdf' }));
      expect(await screen.findByText(/couldn.t read that pdf/i)).toBeInTheDocument();
      expect(screen.queryByRole('img', { name: /insurance sticker preview/i })).not.toBeInTheDocument();
      spy.mockRestore();
    });
  });

  it('uploads the sticker and saves its URL on the vehicle, without adding it to the photo gallery', async () => {
    const user = userEvent.setup();
    localStorage.removeItem('ret.vehiclePhotos');
    let put;
    const uploaded = [];
    const realPost = api.post.bind(api);
    const post = vi.spyOn(api, 'post').mockImplementation((url, data, config) => {
      if (String(url).includes('/photos')) {
        uploaded.push({ url, name: data.get('file').name });
        return Promise.resolve({ data: { id: 'p1', fileName: 'x.jpg', url: '/uploads/vehicles/sticker-uuid.jpg' } });
      }
      return realPost(url, data, config);
    });
    server.use(
      http.put(`${BASE}/vehicles/:id`, async ({ request }) => {
        put = await request.json();
        return HttpResponse.json({ id: 'new-vehicle-id', ...put });
      })
    );
    renderPage();
    await goToPhotos(user);
    await user.click(screen.getByRole('button', { name: /^add vehicle$/i }));

    await screen.findByText(/toyota prado added/i);
    await waitFor(() => expect(put).toBeDefined());
    expect(uploaded).toEqual([{ url: '/vehicles/new-vehicle-id/photos', name: 'sticker.jpg' }]);
    expect(put.insuranceVerificationStickerPhoto).toBe('http://192.168.8.11:8080/uploads/vehicles/sticker-uuid.jpg');
    expect(put).toMatchObject({ comprehensiveInsurance: true, model: 'Toyota Prado' });
    expect(localStorage.getItem('ret.vehiclePhotos')).toBeNull();
    post.mockRestore();
  });

  it('offers a retry when the server says OK but does not keep the insurance sticker', async () => {
    const user = userEvent.setup();
    // The live backend does this: 200 on the update, but the sticker field comes back empty.
    server.use(http.put(`${BASE}/vehicles/:id`, async ({ request }) => {
      const body = await request.json();
      return HttpResponse.json({ id: 'new-vehicle-id', ...body, insuranceVerificationStickerPhoto: null });
    }));
    renderPage();
    await goToPhotos(user);
    await user.click(screen.getByRole('button', { name: /^add vehicle$/i }));

    expect(await screen.findByText(/insurance sticker photo didn't upload/i)).toBeInTheDocument();
  });

  it('offers a retry when the insurance sticker does not upload', async () => {
    const user = userEvent.setup();
    server.use(http.post(`${BASE}/vehicles/:id/photos`, () => HttpResponse.json({ message: 'boom' }, { status: 500 })));
    renderPage();
    await goToPhotos(user);
    await user.click(screen.getByRole('button', { name: /^add vehicle$/i }));

    expect(await screen.findByText(/insurance sticker photo didn't upload/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('is "always available" by default: no dates are asked for or sent', async () => {
    const user = userEvent.setup();
    let body;
    server.use(
      http.post(`${BASE}/vehicles/create-vehicle`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ id: 'new-vehicle-id', ...body });
      })
    );
    renderPage();
    await fillCar(user);
    await next(user);
    await screen.findByLabelText(/^location$/i);
    await fillPrice(user);
    await next(user);
    await screen.findByLabelText(/fuel type/i);

    expect(screen.getByRole('radio', { name: /always available/i })).toBeChecked();
    expect(screen.queryByLabelText(/available from/i)).not.toBeInTheDocument();
    await fillFeatures(user);
    await next(user);
    await screen.findByText(/0 of 6 angles added/i);
    await user.click(screen.getByRole('button', { name: /^add vehicle$/i }));

    await screen.findByText(/toyota prado added/i);
    expect(body).not.toHaveProperty('availableFrom');
    expect(body).not.toHaveProperty('availableTo');
    expect(body).not.toHaveProperty('availabilityMode');
  });

  it('requires both a start and an end (date and time) when the vehicle is only available on specific dates', async () => {
    const user = userEvent.setup();
    renderPage();
    await fillCar(user);
    await next(user);
    await screen.findByLabelText(/^location$/i);
    await fillPrice(user);
    await next(user);
    await screen.findByLabelText(/fuel type/i);
    await fillFeatures(user);
    await user.click(screen.getByRole('radio', { name: /only on specific dates/i }));
    expect(screen.getByLabelText(/available from/i)).toHaveAttribute('type', 'datetime-local');
    await next(user);

    expect(await screen.findByText(/choose the date and time it becomes available/i)).toBeInTheDocument();
    expect(screen.getByText(/choose the date and time it stops being available/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^features$/i })).toBeInTheDocument();
  });

  it('leaves the optional fields out of the request when they are not filled in', async () => {
    const user = userEvent.setup();
    let body;
    server.use(
      http.post(`${BASE}/vehicles/create-vehicle`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ id: 'new-vehicle-id', ...body });
      })
    );
    renderPage();
    await goToPhotos(user);
    await user.click(screen.getByRole('button', { name: /^add vehicle$/i }));

    await screen.findByText(/toyota prado added/i);
    expect(body).not.toHaveProperty('availableFrom');
    expect(body).not.toHaveProperty('availableTo');
    expect(body).toMatchObject({ hasWorkingAC: false });
  });

  it('will not leave the features step when the availability window ends before it starts', async () => {
    const user = userEvent.setup();
    renderPage();
    await fillCar(user);
    await next(user);
    await screen.findByLabelText(/^location$/i);
    await fillPrice(user);
    await next(user);
    await screen.findByLabelText(/fuel type/i);
    await fillFeatures(user);
    await user.click(screen.getByRole('radio', { name: /only on specific dates/i }));
    fireEvent.change(screen.getByLabelText(/available from/i), { target: { value: '2026-12-01T09:00' } });
    fireEvent.change(screen.getByLabelText(/available until/i), { target: { value: '2026-10-01T09:00' } });
    await next(user);

    expect(await screen.findByText(/the end must be after the start/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^features$/i })).toBeInTheDocument();
  });

  it('starts again from the first step when "Add Another" is clicked', async () => {
    const user = userEvent.setup();
    renderPage();
    await goToPhotos(user);
    await user.click(screen.getByRole('button', { name: /^add vehicle$/i }));

    await waitFor(() => expect(screen.getByRole('button', { name: /add another/i })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /add another/i }));

    expect(screen.getByRole('heading', { name: /about the car/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^model$/i)).toHaveValue('');
  });

  it('has no accessibility violations', async () => {
    const { container } = renderPage();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
