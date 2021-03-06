import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async findUserByUserId(id: number) {
    const user = await this.userRepository.findOne({
      where: { id },
    });
    if (!user) {
      throw new NotFoundException(`User #{id} not found`);
    }
    return user;
  }
  async getBlogsByUserId(id: number) {
    return this.userRepository.findOne({
      where: { id },
      relations: { blogs: true },
    });
  }
  async getAll() {
    return this.userRepository.find();
  }
  async createUser(createUserDto: CreateUserDto) {
    const saltOrRounds = 10;
    const hash = await bcrypt.hash(createUserDto.password, saltOrRounds);
    createUserDto.password = hash;
    const user = this.userRepository.create({
      ...createUserDto,
    });
    return this.userRepository.save(user);
    // use for sign up
    // create user
  }
  async updateUser(id: number, updateUserDto: UpdateUserDto) {
    if (updateUserDto.password) {
      const saltOrRounds = 10;
      const hash = await bcrypt.hash(updateUserDto.password, saltOrRounds);
      updateUserDto.password = hash;
    }
    // const userExist = await this.findUserByUserId(id);
    // if (!userExist) {
    //   throw new NotFoundException(`User with #${id} not found`);
    // }
    const user = await this.userRepository.preload({
      id: +id,
      ...updateUserDto,
    });
    if (!user) {
      throw new NotFoundException(`User with #${id} not found`);
    }
    return this.userRepository.save(user);
  }
  async login(loginUserDto: LoginUserDto) {
    const user = await this.userRepository.findOne({
      where: { userName: loginUserDto.userName },
    });
    if (!user) {
      throw new BadRequestException('User Not Found');
    }
    if (!(await bcrypt.compare(loginUserDto.password, user.password))) {
      throw new BadRequestException('Invalid Credentials');
    }
    const jwt = await this.jwtService.signAsync({
      username: user.userName,
      sub: user.id,
    });
    return jwt;
  }
}
