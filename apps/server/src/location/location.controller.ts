import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { LocationService } from './location.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { GetDirectionsDto } from './dto/get-directions.dto';
import { Public } from '../auth/public.decorator';

@Controller('locations')
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Public()
  @Post()
  create(@Body() createLocationDto: CreateLocationDto) {
    return this.locationService.createLocationWithCoordinates(
      createLocationDto,
    );
  }

  @Public()
  @Get()
  findAll() {
    return this.locationService.findAll();
  }

  @Public()
  @Get('search')
  searchPlace(@Query('query') query: string) {
    return this.locationService.searchPlaceByText(query);
  }

  @Public()
  @Get('autocomplete')
  autocomplete(
    @Query('query') query: string,
    @Query('biasLat') biasLat?: string,
    @Query('biasLng') biasLng?: string,
  ) {
    return this.locationService.autocompleteAddress(
      query,
      biasLat ? parseFloat(biasLat) : undefined,
      biasLng ? parseFloat(biasLng) : undefined,
    );
  }

  @Public()
  @Get('directions')
  getDirections(@Query() dto: GetDirectionsDto) {
    return this.locationService.getDirections(dto);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.locationService.findOne(id);
  }

  @Public()
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateLocationDto: UpdateLocationDto,
  ) {
    return this.locationService.updateLocation(id, updateLocationDto);
  }
}
